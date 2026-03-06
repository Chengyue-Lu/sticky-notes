// 文件说明：后端 notes/tasks 数据命令实现模块。
use chrono::{Duration, Local};
use tauri::{AppHandle, State};
use uuid::Uuid;

use super::{
    format_timestamp, normalize_plain_string, normalize_tags, normalize_title, parse_timestamp,
    with_storage_lock, CommandResult, CreateFutureTaskInput, CreateNoteInput, FutureTask, Note,
    StorageState, UNTITLED_NOTE_TITLE, UNTITLED_TASK_TITLE, UpdateFutureTaskInput,
    UpdateFutureTaskStatusInput, UpdateNoteInput,
};
use super::storage::{
    read_future_tasks_unlocked, read_notes_unlocked, write_future_tasks_unlocked,
    write_notes_unlocked,
};

fn create_note_record(input: CreateNoteInput) -> Note {
    let timestamp = format_timestamp(Local::now());

    Note {
        id: Uuid::new_v4().to_string(),
        title: normalize_title(Some(input.title.as_str()), UNTITLED_NOTE_TITLE),
        content: normalize_plain_string(Some(input.content.as_str()), ""),
        tags: normalize_tags(input.tags.as_deref()),
        created_at: timestamp.clone(),
        updated_at: timestamp,
        pinned: input.pinned.unwrap_or(false),
    }
}

fn create_future_task_record(input: CreateFutureTaskInput) -> FutureTask {
    let timestamp = format_timestamp(Local::now());
    let due_at = parse_timestamp(input.due_at.as_str())
        .map(format_timestamp)
        .unwrap_or_else(|| format_timestamp(Local::now() + Duration::hours(1)));

    FutureTask {
        id: Uuid::new_v4().to_string(),
        title: normalize_title(Some(input.title.as_str()), UNTITLED_TASK_TITLE),
        due_at,
        created_at: timestamp,
        completed: false,
    }
}

fn update_future_task_record(task: &FutureTask, input: UpdateFutureTaskInput) -> FutureTask {
    let next_title = match input.title.as_deref() {
        Some(title) => normalize_title(Some(title), task.title.as_str()),
        None => task.title.clone(),
    };
    let next_due_at = match input.due_at.as_deref() {
        Some(due_at) => parse_timestamp(due_at)
            .map(format_timestamp)
            .unwrap_or_else(|| task.due_at.clone()),
        None => task.due_at.clone(),
    };

    FutureTask {
        id: task.id.clone(),
        title: next_title,
        due_at: next_due_at,
        created_at: task.created_at.clone(),
        completed: task.completed,
    }
}

fn update_future_task_status_record(
    task: &FutureTask,
    input: UpdateFutureTaskStatusInput,
) -> FutureTask {
    if input.completed {
        return FutureTask {
            id: task.id.clone(),
            title: task.title.clone(),
            due_at: task.due_at.clone(),
            created_at: task.created_at.clone(),
            completed: true,
        };
    }

    let now = Local::now();
    let should_shift_due_at = parse_timestamp(task.due_at.as_str())
        .map(|due_at| due_at <= now)
        .unwrap_or(true);
    let due_at = if task.completed && should_shift_due_at {
        format_timestamp(now + Duration::hours(1))
    } else {
        task.due_at.clone()
    };

    FutureTask {
        id: task.id.clone(),
        title: task.title.clone(),
        due_at,
        created_at: task.created_at.clone(),
        completed: false,
    }
}

fn update_note_record(note: &Note, input: UpdateNoteInput) -> Note {
    let next_title = match input.title.as_deref() {
        Some(title) => normalize_title(Some(title), note.title.as_str()),
        None => note.title.clone(),
    };
    let next_content = match input.content.as_deref() {
        Some(content) => normalize_plain_string(Some(content), ""),
        None => note.content.clone(),
    };
    let next_tags = match input.tags.as_deref() {
        Some(tags) => normalize_tags(Some(tags)),
        None => note.tags.clone(),
    };
    let next_pinned = input.pinned.unwrap_or(note.pinned);
    let did_content_change =
        next_title != note.title || next_content != note.content || next_tags != note.tags;

    Note {
        id: note.id.clone(),
        title: next_title,
        content: next_content,
        tags: next_tags,
        created_at: note.created_at.clone(),
        updated_at: if did_content_change {
            format_timestamp(Local::now())
        } else {
            note.updated_at.clone()
        },
        pinned: next_pinned,
    }
}

pub(super) fn list_notes(
    app: AppHandle,
    state: State<'_, StorageState>,
) -> CommandResult<Vec<Note>> {
    with_storage_lock(&state, || read_notes_unlocked(&app))
}

pub(super) fn create_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    input: CreateNoteInput,
) -> CommandResult<Note> {
    with_storage_lock(&state, || {
        let mut notes = read_notes_unlocked(&app)?;
        let note = create_note_record(input);

        notes.insert(0, note.clone());
        write_notes_unlocked(&app, &notes)?;

        Ok(note)
    })
}

pub(super) fn update_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateNoteInput,
) -> CommandResult<Option<Note>> {
    with_storage_lock(&state, || {
        let mut notes = read_notes_unlocked(&app)?;
        let Some(target_index) = notes.iter().position(|note| note.id == id) else {
            return Ok(None);
        };
        let note = update_note_record(&notes[target_index], input);

        notes[target_index] = note.clone();
        write_notes_unlocked(&app, &notes)?;

        Ok(Some(note))
    })
}

pub(super) fn delete_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
) -> CommandResult<bool> {
    with_storage_lock(&state, || {
        let mut notes = read_notes_unlocked(&app)?;
        let original_len = notes.len();

        notes.retain(|note| note.id != id);

        if notes.len() == original_len {
            return Ok(false);
        }

        write_notes_unlocked(&app, &notes)?;

        Ok(true)
    })
}

pub(super) fn list_future_tasks(
    app: AppHandle,
    state: State<'_, StorageState>,
) -> CommandResult<Vec<FutureTask>> {
    with_storage_lock(&state, || read_future_tasks_unlocked(&app))
}

pub(super) fn create_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    input: CreateFutureTaskInput,
) -> CommandResult<FutureTask> {
    with_storage_lock(&state, || {
        let mut tasks = read_future_tasks_unlocked(&app)?;
        let task = create_future_task_record(input);

        tasks.push(task.clone());
        write_future_tasks_unlocked(&app, &tasks)?;

        Ok(task)
    })
}

pub(super) fn update_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateFutureTaskInput,
) -> CommandResult<Option<FutureTask>> {
    with_storage_lock(&state, || {
        let mut tasks = read_future_tasks_unlocked(&app)?;
        let Some(target_index) = tasks.iter().position(|task| task.id == id) else {
            return Ok(None);
        };
        let task = update_future_task_record(&tasks[target_index], input);

        tasks[target_index] = task.clone();
        write_future_tasks_unlocked(&app, &tasks)?;

        Ok(Some(task))
    })
}

pub(super) fn delete_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
) -> CommandResult<bool> {
    with_storage_lock(&state, || {
        let mut tasks = read_future_tasks_unlocked(&app)?;
        let original_len = tasks.len();

        tasks.retain(|task| task.id != id);

        if tasks.len() == original_len {
            return Ok(false);
        }

        write_future_tasks_unlocked(&app, &tasks)?;

        Ok(true)
    })
}

pub(super) fn set_future_task_completed(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateFutureTaskStatusInput,
) -> CommandResult<Option<FutureTask>> {
    with_storage_lock(&state, || {
        let mut tasks = read_future_tasks_unlocked(&app)?;
        let Some(target_index) = tasks.iter().position(|task| task.id == id) else {
            return Ok(None);
        };
        let task = update_future_task_status_record(&tasks[target_index], input);

        tasks[target_index] = task.clone();
        write_future_tasks_unlocked(&app, &tasks)?;

        Ok(Some(task))
    })
}


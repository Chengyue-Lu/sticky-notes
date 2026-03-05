export type FutureTask = {
  id: string;
  title: string;
  dueAt: string;
  createdAt: string;
  completed: boolean;
};

export type CreateFutureTaskInput = {
  title: string;
  dueAt: string;
};

export type UpdateFutureTaskInput = {
  title?: string;
  dueAt?: string;
};

export type UpdateFutureTaskStatusInput = {
  completed: boolean;
};

/** 文件说明：应用根组件，负责解析窗口类型并挂载页面。 */
import NotesBoard from './pages/NotesBoard';

type DetachedModuleKind = 'notes' | 'tasks';

function readDetachedModuleFromSearch(): DetachedModuleKind | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  if (params.get('windowKind') !== 'module') {
    return null;
  }

  const moduleValue = params.get('module');

  if (moduleValue === 'notes' || moduleValue === 'tasks') {
    return moduleValue;
  }

  return null;
}

function App() {
  return <NotesBoard detachedModule={readDetachedModuleFromSearch()} />;
}

export default App;


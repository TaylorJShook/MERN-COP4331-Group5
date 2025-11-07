import LoggedInName from '../components/LoggedInName';
import TodoUI from '../components/TodoUI';

const TodoPage = () =>
{
    return(
        <div className="login-page">
            {/* Animated background blobs */}
            <div className="blob blob--indigo" aria-hidden="true" />
            <div className="blob blob--mint" aria-hidden="true" />
            <div className="blob blob--pink" aria-hidden="true" />

            {/* Top bar */}
            <header className="topbar">
                <div className="topbar__inner">
                    <span className="brand">Daily Task Planner</span>
                    <LoggedInName />
                </div>
            </header>

            {/* Main content */}
            <main className="todo-page-content">
                <TodoUI />
            </main>
        </div>
    );
}

export default TodoPage;

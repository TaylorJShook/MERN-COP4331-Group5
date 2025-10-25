import PageTitle from '../components/PageTitle';
import LoggedInName from '../components/LoggedInName';
import TodoUI from '../components/TodoUI';

const TodoPage = () =>
{
    return(
        <div>
            <PageTitle />
            <LoggedInName />
            <TodoUI />
        </div>
    );
}

export default TodoPage;

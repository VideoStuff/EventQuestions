import { useData } from "./store";
import { useRoute } from "./router";
import ShowList from "./components/ShowList";
import ShowEditor from "./components/ShowEditor";
import QuestionsPage from "./components/QuestionsPage";
import PrintView from "./components/PrintView";

export default function App() {
  const { data, storage, update } = useData();
  const [page, id, sub] = useRoute();
  const show = page === "show" ? data.shows.find((s) => s.id === id) : undefined;

  let body;
  if (page === "show" && show && sub === "print") body = <PrintView show={show} bank={data.bank} />;
  else if (page === "show" && show) body = <ShowEditor key={show.id} show={show} bank={data.bank} update={update} />;
  else if (page === "show") body = <div className="narrow"><h1>Show not found</h1><p className="muted">It isn't in this browser. Open its show file from the <a href="#/">Shows</a> page.</p></div>;
  else if (page === "questions") body = <QuestionsPage data={data} update={update} />;
  else body = <ShowList data={data} update={update} />;

  return (
    <>
      <header className="topbar no-print">
        <nav className="wide row">
          <a href="#/" className="brand">Show Sheets</a>
          <a href="#/">Shows</a>
          <a href="#/questions">Questions</a>
          {page === "show" && show && <span className="muted small crumb">{show.meta.op_number || show.meta.name}</span>}
        </nav>
      </header>
      <main className="wide">
        {storage === "unavailable" && (
          <div className="card error no-print">
            This browser isn&apos;t letting the page keep your work (private window or blocked site data). Use
            <strong> Download show file</strong> before you close the tab.
          </div>
        )}
        {body}
      </main>
    </>
  );
}

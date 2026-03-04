const projects = [
  {
    name: "St. Gabriel Website v2",
    status: "In Progress",
    progress: 68,
    priority: "High",
  },
  {
    name: "Universal Task Dashboard",
    status: "In Progress",
    progress: 82,
    priority: "Critical",
  },
  {
    name: "Trading Bot Monitoring",
    status: "Planned",
    progress: 15,
    priority: "Medium",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl bg-[#4a94c4] p-6 text-white shadow-sm">
          <h1 className="text-3xl font-bold">Universal Task Dashboard</h1>
          <p className="mt-2 text-sm text-white/90">
            Track active builds, priorities, and delivery progress in one place.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <article key={project.name} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{project.name}</h2>
                <span className="rounded-full bg-[#ffd400] px-2 py-1 text-xs font-semibold text-slate-900">
                  {project.priority}
                </span>
              </div>

              <p className="text-sm text-slate-600">Status: {project.status}</p>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#4a94c4]"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}


export default function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-3">
            {value}
          </h3>
        </div>

        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={23} />
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4">{description}</p>
    </div>
  );
}

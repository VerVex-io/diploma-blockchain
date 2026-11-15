
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  Settings,
  GraduationCap,
  LogOut
} from "lucide-react";

import { NavLink } from "react-router-dom";

const links = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "All Diplomas", path: "/diplomas", icon: FileText },
  { name: "Issue Diploma", path: "/issue", icon: PlusCircle },
  { name: "Verify Diploma", path: "/verify", icon: ShieldCheck },
  { name: "Revoke Diploma", path: "/revoke", icon: ShieldAlert },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-xl">
          <GraduationCap size={25} />
        </div>
        <div>
          <h1 className="text-xl font-bold">DiplomaChain</h1>
          <p className="text-xs text-slate-400">Certification Portal</p>
        </div>
      </div>

      <div className="px-4 py-6 flex-1">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-4 px-3">
          Main Menu
        </p>

        <nav className="space-y-2">
          {links.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon size={19} />
              <span className="text-sm font-medium">{name}</span>
            </NavLink>
          ))}
        </nav>

        <p className="text-xs uppercase tracking-wider text-slate-500 mb-4 mt-10 px-3">
          System
        </p>

        <button className="w-full flex items-center gap-3 px-3 py-3 text-slate-400 hover:bg-slate-800 rounded-lg">
          <Settings size={19} />
          <span className="text-sm">Settings</span>
        </button>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
            UA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">University Admin</p>
            <p className="text-xs text-slate-400">Administrator</p>
          </div>
          <LogOut size={17} className="text-slate-500" />
        </div>
      </div>
    </aside>
  );
}

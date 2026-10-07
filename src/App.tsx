import { useEffect, useState } from "react";
import { ChartLineUp, Gear, Stairs, Timer } from "@phosphor-icons/react";
import { StoreProvider, useStore } from "./lib/store";
import { Today } from "./screens/Today";
import { Plan } from "./screens/Plan";
import { Progress } from "./screens/Progress";
import { Settings } from "./screens/Settings";

const TABS = [
  { id: "today", label: "Today", Icon: Timer, View: Today },
  { id: "plan", label: "Ramp", Icon: Stairs, View: Plan },
  { id: "progress", label: "Progress", Icon: ChartLineUp, View: Progress },
  { id: "settings", label: "Settings", Icon: Gear, View: Settings },
] as const;
type TabId = (typeof TABS)[number]["id"];

function readTab(): TabId {
  const h = location.hash.slice(1);
  return (TABS.find((t) => t.id === h)?.id ?? "today") as TabId;
}

function Shell() {
  const { state } = useStore();
  const [tab, setTab] = useState<TabId>(readTab);
  const theme = state.settings.theme;

  useEffect(() => {
    const on = () => setTab(readTab());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
  }, [theme]);

  const go = (id: TabId) => {
    history.replaceState(null, "", `#${id}`);
    setTab(id);
    scrollTo({ top: 0 });
  };

  const View = TABS.find((t) => t.id === tab)!.View;
  return (
    <div className="app">
      <main key={tab} className="view">
        <View />
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`tab ${tab === id ? "on" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => go(id)}>
            <Icon size={22} weight={tab === id ? "fill" : "regular"} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

import { useRef } from "react";
import styles from "../styles/mission.module.css";

interface TabBarProps {
  tabs: string[];
  active: string;
  onTabChange: (tab: string) => void;
}

export function TabBar({ tabs, active, onTabChange }: TabBarProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTabAt(idx: number) {
    const len = tabs.length;
    const i = ((idx % len) + len) % len;
    refs.current[i]?.focus();
  }

  function handleKey(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusTabAt(idx + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusTabAt(idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTabAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusTabAt(tabs.length - 1);
    }
  }

  return (
    <div className={styles.tabBar} role="tablist">
      {tabs.map((tab, i) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
            onClick={() => onTabChange(tab)}
            onKeyDown={(e) => handleKey(e, i)}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

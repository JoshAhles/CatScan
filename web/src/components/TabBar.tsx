import styles from "../styles/mission.module.css";

interface TabBarProps {
  tabs: string[];
  active: string;
  onTabChange: (tab: string) => void;
}

export function TabBar({ tabs, active, onTabChange }: TabBarProps) {
  return (
    <div className={styles.tabBar} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-current={tab === active ? "page" : undefined}
          className={`${styles.tab} ${tab === active ? styles.tabActive : ""}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

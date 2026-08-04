import { CircleHelp } from 'lucide-react';
import styles from './HelpButton.module.css';

interface HelpButtonProps {
  onClick: () => void;
}

export function HelpButton({ onClick }: HelpButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      aria-label="What is this tool? Show the introduction again"
    >
      <CircleHelp size={18} strokeWidth={1.8} />
    </button>
  );
}

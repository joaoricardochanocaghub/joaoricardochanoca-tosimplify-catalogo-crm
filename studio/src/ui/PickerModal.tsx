import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { Modal } from "./Modal";

export interface PickerItem {
  id: string;
  title: string;
  subtitle: string;
}

interface PickerModalProps {
  title: string;
  icon: IconName;
  items: PickerItem[];
  emptyText: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** Lista simples para escolher um cliente ou um item do catálogo. */
export function PickerModal({ title, icon, items, emptyText, onPick, onClose }: PickerModalProps) {
  return (
    <Modal title={title} icon={icon} onClose={onClose}>
      {items.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <ul className="pick-list">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="pick" onClick={() => onPick(item.id)}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
                <Icon name="chevron" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

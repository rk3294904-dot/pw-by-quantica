import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap py-3 text-sm">
      <button
        onClick={items[0].onClick}
        className="flex items-center gap-1 text-slate-400 transition hover:text-blue-400"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </button>
      {items.slice(1).map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-slate-600" />
          <button
            onClick={item.onClick}
            disabled={!item.onClick}
            className={
              item.onClick
                ? 'text-slate-400 transition hover:text-blue-400'
                : 'text-slate-200 font-medium cursor-default'
            }
          >
            {item.label}
          </button>
        </div>
      ))}
    </nav>
  );
}

import { useEffect, useState, type ReactNode } from 'react';

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return path;
}

export function navigate(to: string) {
  const [target, hash] = to.split('#');
  if (window.location.pathname !== target) {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } else if (hash) {
    window.history.replaceState({}, '', to);
  }
  if (hash) {
    requestAnimationFrame(() => {
      const element = document.getElementById(hash);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

type LinkProps = {
  to: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
  'aria-label'?: string;
};

export function Link({ to, children, className, onNavigate, ...rest }: LinkProps) {
  return (
    <a
      href={to}
      className={className}
      aria-label={rest['aria-label']}
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
        onNavigate?.();
      }}
    >
      {children}
    </a>
  );
}

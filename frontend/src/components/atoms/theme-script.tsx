/**
 * Inline script that sets html[data-theme] before first paint, preventing a
 * flash of the wrong theme. Reads the saved choice, else prefers-color-scheme.
 * Rendered in <head> by the root layout.
 */
export function ThemeScript() {
  const script = `(function(){try{
    var t = localStorage.getItem('hr-theme');
    if(!t){ t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light';
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

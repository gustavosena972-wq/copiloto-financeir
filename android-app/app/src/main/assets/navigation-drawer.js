/* App navigation is available on demand, without taking dashboard space. */
(() => {
  const app = document.getElementById('app');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const menuIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  function enhance() {
    const shell = app.querySelector('.app-shell');
    if (!shell) return;
    let drawer = shell.querySelector('#cf-app-navigation');
    if (!drawer) {
      const sidebar = shell.querySelector('.app-sidebar');
      if (!sidebar) return;
      drawer = document.createElement('dialog');
      drawer.id = 'cf-app-navigation';
      drawer.className = 'cf-app-navigation';
      drawer.setAttribute('aria-label', 'Áreas do Copiloto Financeiro');
      drawer.innerHTML = '<form method="dialog" class="cf-drawer-heading"><strong>Seu aplicativo</strong><button aria-label="Fechar áreas do aplicativo">Fechar</button></form>';
      drawer.append(sidebar);
      shell.append(drawer);
      shell.dataset.drawerNavigation = '1';
      drawer.addEventListener('click', event => {
        if (event.target === drawer || event.target.closest('[data-act="view"]')) drawer.close();
      });
      drawer.addEventListener('close', () => {
        document.querySelectorAll('[data-app-menu]').forEach(button => button.setAttribute('aria-expanded', 'false'));
      });
    }
    const hosts = [shell.querySelector('.app-topbar'), document.querySelector('#cf-tm-root .cf-tm-head')].filter(Boolean);
    hosts.forEach(host => {
      if (host.querySelector('[data-app-menu]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cf-app-menu';
      button.dataset.appMenu = '1';
      button.setAttribute('aria-label', 'Abrir áreas do aplicativo');
      button.setAttribute('aria-controls', drawer.id);
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = menuIcon + '<span>Áreas</span>';
      button.onclick = () => {
        if (!drawer.isConnected) return;
        drawer.showModal();
        button.setAttribute('aria-expanded', 'true');
        if (!reduced.matches) drawer.animate([{transform:'translateX(-100%)'}, {transform:'translateX(0)'}], {duration:240,easing:'cubic-bezier(.16,1,.3,1)'});
      };
      host.prepend(button);
    });
  }
  new MutationObserver(enhance).observe(document.body, {childList:true,subtree:true});
  enhance();
})();

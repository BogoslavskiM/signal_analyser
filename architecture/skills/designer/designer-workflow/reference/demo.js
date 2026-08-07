(() => {
  const root = document.querySelector("[data-demo-root]");
  const controls = document.querySelectorAll("[data-demo-state]");
  const views = document.querySelectorAll("[data-state-view]");

  function setState(state) {
    root.dataset.state = state;
    views.forEach((view) => {
      view.hidden = view.dataset.stateView !== state;
    });
  }

  controls.forEach((control) => {
    control.addEventListener("click", () => setState(control.dataset.demoState));
  });
})();

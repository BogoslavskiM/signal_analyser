(function registerGenieTooltip(window, document) {
  "use strict";

  function createTooltip(options) {
    var config = options || {};
    var root = null;
    var timer = null;
    var state = { activeTarget: null, visible: false, text: "" };

    function tooltipElement() {
      var tooltip = document.querySelector(".ui-tooltip");
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.className = "ui-tooltip";
        tooltip.setAttribute("role", "tooltip");
        document.body.appendChild(tooltip);
      }
      return tooltip;
    }

    function render() {
      var tooltip = tooltipElement();
      tooltip.textContent = state.text;
      tooltip.classList.toggle("is-visible", state.visible);
      return '<div class="ui-tooltip' + (state.visible ? " is-visible" : "") +
        '" role="tooltip">' + String(state.text || "") + "</div>";
    }

    function cancelTimer() {
      if (timer != null) window.clearTimeout(timer);
      timer = null;
    }

    function position(target) {
      var tooltip = tooltipElement();
      render();
      var targetRect = target.getBoundingClientRect();
      var tooltipRect = tooltip.getBoundingClientRect();
      var gap = 8;
      var top = targetRect.bottom + gap;
      var left = targetRect.left + targetRect.width / 2;
      if (top + tooltipRect.height > window.innerHeight - gap) top = targetRect.top - tooltipRect.height - gap;
      left = Math.min(Math.max(left, tooltipRect.width / 2 + gap), window.innerWidth - tooltipRect.width / 2 - gap);
      top = Math.min(Math.max(top, gap), window.innerHeight - tooltipRect.height - gap);
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }

    var actions = {
      schedule: function (target) {
        if (!target) return;
        cancelTimer(); state.activeTarget = target;
        timer = window.setTimeout(function () {
          timer = null;
          if (state.activeTarget === target && document.body.contains(target)) {
            state.text = target.getAttribute("data-tooltip") || "";
            state.visible = Boolean(state.text);
            if (state.visible) position(target); else render();
          }
        }, Number.isFinite(config.delayMs) ? config.delayMs : 1500);
      },
      hide: function () {
        cancelTimer(); state.activeTarget = null; state.visible = false; state.text = ""; render();
      },
    };

    function tooltipTarget(event) {
      return event.target && event.target.closest ? event.target.closest("[data-tooltip]") : null;
    }
    function onEnter(event) { var target = tooltipTarget(event); if (target) actions.schedule(target); }
    function onLeave(event) {
      var target = tooltipTarget(event);
      if (target && (!event.relatedTarget || !target.contains(event.relatedTarget))) actions.hide();
    }

    function mount(element) {
      if (root) unmount();
      root = element || document;
      root.addEventListener("mouseover", onEnter); root.addEventListener("focusin", onEnter);
      root.addEventListener("mouseout", onLeave); root.addEventListener("focusout", onLeave);
      root.addEventListener("click", actions.hide); window.addEventListener("scroll", actions.hide, true);
      window.addEventListener("resize", actions.hide); render(); return module;
    }

    function unmount() {
      if (!root) return;
      root.removeEventListener("mouseover", onEnter); root.removeEventListener("focusin", onEnter);
      root.removeEventListener("mouseout", onLeave); root.removeEventListener("focusout", onLeave);
      root.removeEventListener("click", actions.hide); window.removeEventListener("scroll", actions.hide, true);
      window.removeEventListener("resize", actions.hide); root = null; actions.hide();
    }

    var module = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return module;
  }

  window.GenieTooltip = { create: createTooltip };
})(window, document);

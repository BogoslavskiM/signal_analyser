(function registerTooltip(document, window) {
  "use strict";

  var TOOLTIP_DELAY_MS = 1500;
  var tooltipTimer = null;
  var activeTarget = null;

  function ensureTooltip() {
    var tooltip = document.querySelector(".ui-tooltip");

    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "ui-tooltip";
      tooltip.setAttribute("role", "tooltip");
      document.body.appendChild(tooltip);
    }

    return tooltip;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function showTooltip(target) {
    var text = target.getAttribute("data-tooltip");
    if (!text) return;

    var tooltip = ensureTooltip();
    tooltip.textContent = text;
    tooltip.classList.add("is-visible");

    var targetRect = target.getBoundingClientRect();
    var tooltipRect = tooltip.getBoundingClientRect();
    var gap = 8;
    var top = targetRect.bottom + gap;
    var left = targetRect.left + targetRect.width / 2;

    if (top + tooltipRect.height > window.innerHeight - gap) {
      top = targetRect.top - tooltipRect.height - gap;
    }

    left = clamp(
      left,
      tooltipRect.width / 2 + gap,
      window.innerWidth - tooltipRect.width / 2 - gap
    );
    top = clamp(top, gap, window.innerHeight - tooltipRect.height - gap);
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function cancelTimer() {
    if (!tooltipTimer) return;
    window.clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }

  function scheduleTooltip(target) {
    if (target === activeTarget && tooltipTimer) return;

    cancelTimer();
    activeTarget = target;
    tooltipTimer = window.setTimeout(function () {
      tooltipTimer = null;
      if (activeTarget === target && document.body.contains(target)) {
        showTooltip(target);
      }
    }, TOOLTIP_DELAY_MS);
  }

  function hideTooltip() {
    cancelTimer();
    activeTarget = null;

    var tooltip = document.querySelector(".ui-tooltip");
    if (tooltip) tooltip.classList.remove("is-visible");
  }

  document.addEventListener("mouseover", function (event) {
    var target = event.target.closest("[data-tooltip]");
    if (target) scheduleTooltip(target);
  });

  document.addEventListener("focusin", function (event) {
    var target = event.target.closest("[data-tooltip]");
    if (target) scheduleTooltip(target);
  });

  document.addEventListener("mouseout", function (event) {
    var target = event.target.closest("[data-tooltip]");
    if (target && !target.contains(event.relatedTarget)) hideTooltip();
  });

  document.addEventListener("focusout", function (event) {
    if (event.target.closest("[data-tooltip]")) hideTooltip();
  });

  document.addEventListener("click", hideTooltip);
  window.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", hideTooltip);
})(document, window);

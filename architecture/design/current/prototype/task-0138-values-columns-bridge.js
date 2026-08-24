(function installTask0138PrototypeBridge(window, document) {
  "use strict";

  var helper=window.SignalSamplesCalculatedColumns;
  if (!helper) return;
  var visible=helper.defaultVisibility();
  var busy=false;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g,function (character) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character];
    });
  }

  function root() { return document.querySelector("[data-testid='sample-columns-menu']"); }
  function trigger() { return document.querySelector("[data-testid='sample-columns-menu-trigger']"); }
  function body() { return document.querySelector("[data-testid='inspector-pane-samples']"); }

  function sampleValues(row) {
    if (row.dataset.task0138Values) return JSON.parse(row.dataset.task0138Values);
    var cells=Array.prototype.slice.call(row.cells || []), raw=Number(String(cells[2] && cells[2].textContent || "").replace(",","."));
    var magnitude=Number.isFinite(raw) ? Math.abs(raw) : null;
    var rootMagnitude=magnitude == null ? null : Math.sqrt(magnitude);
    var values={
      sample_index:cells[0] ? cells[0].innerHTML : "—",
      time:cells[1] ? cells[1].textContent : "—",
      value:cells[2] ? cells[2].textContent : "—",
      magnitude:cells[3] ? cells[3].textContent : "—",
      square:cells[4] ? cells[4].textContent : "—",
      square_root:rootMagnitude == null ? "—" : raw < 0 ? "0 + "+rootMagnitude.toFixed(6)+"i" : rootMagnitude.toFixed(6),
      signed_square_root_magnitude:rootMagnitude == null ? "—" : (raw < 0 ? "−" : "")+rootMagnitude.toFixed(6)
    };
    row.dataset.task0138Values=JSON.stringify(values);
    return values;
  }

  function renderTable() {
    var host=body(), table=host && host.querySelector(".sample-table");
    if (!table || busy) return;
    var columns=helper.visibleColumns(visible);
    var signature=columns.map(function (column) { return column.id; }).join("|");
    var currentHead=Array.prototype.map.call(table.tHead && table.tHead.rows[0] && table.tHead.rows[0].cells || [],function (cell) { return cell.dataset.sampleColumn || ""; }).join("|");
    var rowsReady=Array.prototype.every.call(table.tBodies[0] && table.tBodies[0].rows || [],function (row) {
      return !!row.dataset.task0138Values && Array.prototype.map.call(row.cells,function (cell) { return cell.dataset.sampleColumn || ""; }).join("|") === signature;
    });
    if (table.dataset.task0138Signature === signature && currentHead === signature && rowsReady) return;
    busy=true;
    table.dataset.calculatedColumns="true";
    table.dataset.task0138Signature=signature;
    table.style.setProperty("--sample-table-min-width",helper.minimumTableWidth(visible)+"px");
    var head=table.tHead && table.tHead.rows[0];
    if (head) head.innerHTML=columns.map(function (column) { return "<th data-sample-column='"+esc(column.id)+"'>"+esc(column.label)+"</th>"; }).join("");
    Array.prototype.forEach.call(table.tBodies[0] && table.tBodies[0].rows || [],function (row) {
      var projected=helper.rowProjection(sampleValues(row),visible);
      row.innerHTML=projected.map(function (cell) {
        var content=cell.id === "sample_index" ? cell.value : esc(cell.value);
        return "<td data-sample-column='"+esc(cell.id)+"'>"+content+"</td>";
      }).join("");
    });
    busy=false;
  }

  function menuItem(column) {
    var shown=visible[column.id];
    return "<button type='button' role='menuitemcheckbox' aria-checked='"+shown+"' aria-pressed='"+shown+"' data-sample-column-visible='"+esc(column.id)+"'><span>"+esc(column.label)+"</span><img src='./icons/"+(shown ? "eye.svg" : "eye-off.svg")+"' alt=''></button>";
  }

  function renderMenu(focusId) {
    var menu=root();
    if (!menu) return;
    menu.innerHTML="<div class='inspector-menu-title'>"+esc(helper.menu.title)+"</div>"+helper.optionalColumns.map(menuItem).join("");
    if (focusId) {
      var restored=menu.querySelector("[data-sample-column-visible='"+focusId+"']");
      if (restored) restored.focus();
    }
  }

  function positionMenu() {
    var menu=root(), owner=trigger();
    if (!menu || !owner || menu.hidden) return;
    var rect=owner.getBoundingClientRect(), width=helper.menu.width, viewportWidth=Math.min(window.innerWidth,document.documentElement.clientWidth || window.innerWidth), viewportHeight=Math.min(window.innerHeight,document.documentElement.clientHeight || window.innerHeight);
    menu.style.width=width+"px";
    menu.style.left=Math.min(viewportWidth-width-8,Math.max(8,rect.right-width))+"px";
    menu.style.top=rect.bottom+4+"px";
    window.requestAnimationFrame(function () {
      if (!menu.hidden && menu.getBoundingClientRect().bottom > viewportHeight-8) menu.style.top=Math.max(8,rect.top-menu.getBoundingClientRect().height-4)+"px";
    });
  }

  function openMenu(owner) {
    var menu=root();
    if (!menu || !owner) return;
    renderMenu();
    menu.hidden=false;
    owner.setAttribute("aria-expanded","true");
    positionMenu();
    var first=menu.querySelector("button");
    if (first) first.focus();
  }

  function closeMenu(restoreFocus) {
    var menu=root(), owner=trigger();
    if (!menu || menu.hidden) return;
    menu.hidden=true;
    if (owner) {
      owner.setAttribute("aria-expanded","false");
      if (restoreFocus) owner.focus();
    }
  }

  function decorate() {
    var host=body(), row=host && host.querySelector(".samples-point-search-row");
    if (!row) return;
    row.querySelectorAll(".samples-point-search-action,[data-testid='sample-point-search-action']").forEach(function (node) { node.remove(); });
    row.querySelectorAll(".samples-point-search-status:not([data-state='error'])").forEach(function (node) { node.remove(); });
    if (!trigger()) {
      var button=document.createElement("button");
      button.className=helper.trigger.className;
      button.type="button";
      button.dataset.testid=helper.trigger.testid;
      button.dataset.tooltip=helper.trigger.tooltip;
      button.setAttribute("aria-label",helper.trigger.ariaLabel);
      button.setAttribute("aria-haspopup","menu");
      button.setAttribute("aria-controls",helper.menu.testid);
      button.setAttribute("aria-expanded","false");
      button.innerHTML="<img src='./icons/more-vertical.svg' alt=''>";
      row.appendChild(button);
    }
    renderTable();
    document.documentElement.dataset.task0138Ready="true";
  }

  document.addEventListener("click",function (event) {
    var owner=event.target.closest && event.target.closest("[data-testid='sample-columns-menu-trigger']");
    if (owner) {
      event.preventDefault(); event.stopPropagation();
      if (root().hidden) openMenu(owner); else closeMenu(true);
      return;
    }
    var item=event.target.closest && event.target.closest("[data-sample-column-visible]");
    if (item) {
      event.preventDefault(); event.stopPropagation();
      var id=item.dataset.sampleColumnVisible;
      visible=helper.toggle(visible,id);
      renderTable();
      renderMenu(id);
      positionMenu();
      return;
    }
    var menu=root();
    if (menu && !menu.hidden && !menu.contains(event.target)) closeMenu(false);
  },true);

  document.addEventListener("keydown",function (event) {
    var owner=event.target.closest && event.target.closest("[data-testid='sample-columns-menu-trigger']");
    if (owner && ["Enter"," ","ArrowDown"].indexOf(event.key) >= 0) { event.preventDefault(); openMenu(owner); return; }
    var menu=event.target.closest && event.target.closest("[data-testid='sample-columns-menu']");
    if (!menu) return;
    if (event.key === "Escape") { event.preventDefault(); closeMenu(true); return; }
    if (event.key === "Tab") { closeMenu(false); return; }
    var items=Array.prototype.slice.call(menu.querySelectorAll("button")), index=items.indexOf(document.activeElement);
    if (["ArrowDown","ArrowUp","Home","End"].indexOf(event.key) >= 0) {
      event.preventDefault();
      if (event.key === "Home") index=0;
      else if (event.key === "End") index=items.length-1;
      else index=(index+(event.key === "ArrowDown" ? 1 : -1)+items.length)%items.length;
      if (items[index]) items[index].focus();
    }
  },true);

  window.addEventListener("resize",positionMenu);
  new MutationObserver(function () { window.requestAnimationFrame(decorate); }).observe(document.querySelector("[data-inspector-content]") || document.body,{childList:true,subtree:true});
  window.Task0138ValuesColumnsPrototype={ getVisibility:function () { return helper.normalizeVisibility(visible); }, open:openMenu, close:closeMenu, render:decorate };
  decorate();
}(window,document));

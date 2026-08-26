(function registerSignalSamplesCalculatedColumns(window) {
  "use strict";

  var BASE_COLUMNS = [
    { id:"sample_index", label:"№ точки", field:"sample_index", optional:false, minWidth:112 },
    { id:"time", label:"Время", field:"time", optional:false, minWidth:170 },
    { id:"value", label:"Значение", field:"value", optional:false, minWidth:165 }
  ];
  var OPTIONAL_COLUMNS = [
    { id:"magnitude", label:"Модуль", field:"magnitude", optional:true, minWidth:165 },
    { id:"square", label:"Квадрат", field:"square", optional:true, minWidth:165 },
    { id:"signed_square_root_magnitude", label:"Корень из модуля × знак", field:"signed_square_root_magnitude", optional:true, minWidth:240 }
  ];

  function defaultVisibility() {
    return OPTIONAL_COLUMNS.reduce(function (result, column) { result[column.id]=false; return result; }, {});
  }

  function normalizeVisibility(value) {
    var next=defaultVisibility();
    OPTIONAL_COLUMNS.forEach(function (column) {
      if (value && typeof value[column.id] === "boolean") next[column.id]=value[column.id];
    });
    return next;
  }

  function visibleColumns(value) {
    var visible=normalizeVisibility(value);
    return BASE_COLUMNS.concat(OPTIONAL_COLUMNS.filter(function (column) { return visible[column.id]; }));
  }

  function toggle(value, id) {
    var visible=normalizeVisibility(value);
    if (!OPTIONAL_COLUMNS.some(function (column) { return column.id === id; })) return visible;
    visible[id]=!visible[id];
    return visible;
  }

  function minimumTableWidth(value) {
    return visibleColumns(value).reduce(function (sum, column) { return sum + column.minWidth; }, 0);
  }

  function rowProjection(row, value) {
    row=row || {};
    return visibleColumns(value).map(function (column) {
      var projected=row[column.field];
      return { id:column.id, label:column.label, value:projected === null || projected === undefined || projected === "" ? "—" : projected };
    });
  }

  window.SignalSamplesCalculatedColumns = {
    baseColumns:BASE_COLUMNS,
    optionalColumns:OPTIONAL_COLUMNS,
    defaultVisibility:defaultVisibility,
    normalizeVisibility:normalizeVisibility,
    visibleColumns:visibleColumns,
    toggle:toggle,
    minimumTableWidth:minimumTableWidth,
    rowProjection:rowProjection,
    trigger:{ testid:"sample-columns-menu-trigger", className:"inspector-action samples-columns-menu-trigger", icon:"more-vertical.svg", ariaLabel:"Выбрать отображаемые столбцы", tooltip:"Видимость столбцов", placement:"final search-row slot" },
    menu:{ testid:"sample-columns-menu", title:"Видимость столбцов", width:244, itemAttribute:"data-sample-column-visible" },
    searchRowRevision:{ standaloneAction:false, submit:"Enter on sample-point-search-input", persistentStatus:false, compactErrorOnly:true },
    visibilityScope:"one frontend-only preference shared by dynamic signal Values tabs for the current application lifetime",
    providerRule:"UI projects provider-authored fields only; it never calculates derived values",
    excluded:[
      { id:"square_root", reason:"removed from the Values UI and visibility menu by the user" },
      { id:"fft", reason:"explicitly excluded by the user" },
      { id:"multiply", reason:"requires a product decision for multiplier input and lifecycle" },
      { id:"custom", reason:"requires a product decision for operation body, naming and lifecycle" }
    ]
  };
}(window));

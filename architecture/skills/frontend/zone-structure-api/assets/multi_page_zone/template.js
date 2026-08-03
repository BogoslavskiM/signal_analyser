(function registerGenieMultiPageElement(window) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function createMultiPageElement(options) {
    var config = options || {};
    var registry = config.pages || {};
    var syncPages = config.syncPages;
    var root = null;
    var pollTimer = null;
    var state = {
      title: config.title || "", pages: [], order: [], opened_pages: [], main_page: "",
      pageMenuOpen: false, pageMenuStyle: "", runtime: {}, requestIds: {}, syncRequestId: 0,
    };

    function orderedPages() {
      var byId = {};
      state.pages.forEach(function (page) { byId[String(page.id)] = page; });
      return state.order.map(function (id) { return byId[String(id)]; }).filter(Boolean);
    }

    function openedPages() {
      var ids = state.opened_pages.map(String);
      return orderedPages().filter(function (page) { return ids.includes(String(page.id)); });
    }

    function activeId() {
      var opened = openedPages();
      if (opened.some(function (page) { return String(page.id) === String(state.main_page); })) return String(state.main_page);
      return opened.length ? String(opened[0].id) : "";
    }

    function activeMetadata() {
      var id = activeId();
      return orderedPages().find(function (page) { return String(page.id) === id; }) || null;
    }

    function ensureRuntime(id) {
      var module = registry[String(id)] || {};
      if (!state.runtime[id]) {
        state.runtime[id] = typeof module.loadData === "function" ?
          { data: null, isready: false, success: false, error: "" } :
          { data: null, isready: true, success: true, error: "" };
      }
      return state.runtime[id];
    }

    function renderPage() {
      var id = activeId();
      var metadata = activeMetadata();
      var pageModule = registry[id] || {};
      var runtime = ensureRuntime(id);
      if (!id) return '<div class="multi-page-missing">Нет открытых страниц</div>';
      if (!pageModule.rendersOutputState && !runtime.isready) {
        return '<div class="multi-page-status" role="status"><span class="multi-page-spinner"></span></div>';
      }
      if (!pageModule.rendersOutputState && !runtime.success) {
        return '<div class="multi-page-status multi-page-error" role="alert">' +
          escapeHtml(runtime.error || "Не удалось получить данные страницы") + "</div>";
      }
      if (typeof pageModule.render !== "function") {
        return '<div class="multi-page-missing">Frontend module страницы не зарегистрирован</div>';
      }
      return '<div class="multi-page-content" data-page-content="' + escapeHtml(id) + '">' +
        pageModule.render({ pageId: id, metadata: metadata, runtime: runtime, data: runtime.data }) + "</div>";
    }

    function menuSections() {
      var sections = {};
      orderedPages().forEach(function (page) {
        var key = String(page.menu_group || "");
        if (!sections[key]) sections[key] = [];
        sections[key].push(page);
      });
      return Object.keys(sections).map(function (title) {
        return '<section class="multi-page-menu-section">' +
          (title ? '<div class="multi-page-menu-section-title">' + escapeHtml(title) + "</div>" : "") +
          sections[title].map(function (page) {
            var checked = state.opened_pages.map(String).includes(String(page.id));
            return '<label class="multi-page-menu-item"><input class="multi-page-menu-checkbox" type="checkbox"' +
              ' data-page-visible="' + escapeHtml(page.id) + '"' + (checked ? " checked" : "") +
              '><span class="multi-page-menu-copy"><span class="multi-page-menu-title">' + escapeHtml(page.title) +
              '</span>' + (page.description ? '<span class="multi-page-menu-description">' + escapeHtml(page.description) + "</span>" : "") +
              "</span></label>";
          }).join("") + "</section>";
      }).join("");
    }

    function render() {
      var current = activeId();
      var tabs = openedPages().map(function (page) {
        return '<div class="multi-page-tab' + (String(page.id) === current ? " active" : "") + '" data-page-select="' +
          escapeHtml(page.id) + '"><span class="multi-page-tab-title" data-tooltip="' + escapeHtml(page.title) + '">' +
          escapeHtml(page.title) + '</span>' + (page.closable === false ? "" :
            '<button class="multi-page-tab-close" type="button" data-page-close="' + escapeHtml(page.id) +
            '" aria-label="Закрыть вкладку ' + escapeHtml(page.title) + '"></button>') + "</div>";
      }).join("");
      var menu = state.pageMenuOpen ? '<div class="multi-page-menu" data-multi-page-menu style="' +
        escapeHtml(state.pageMenuStyle) + '">' + menuSections() + "</div>" : "";
      var html = '<section class="multi-page-element">' + (state.title ? '<div class="multi-page-titlebar"><h2 class="multi-page-title">' +
        escapeHtml(state.title) + "</h2></div>" : "") + '<div class="multi-page-header"><div class="multi-page-tabs-wrap">' +
        '<button class="multi-page-tab-scroll multi-page-tab-scroll-prev" type="button" data-page-scroll="left" aria-label="Прокрутить вкладки влево"></button>' +
        '<div class="multi-page-tabs" data-multi-page-tabs>' + tabs + '</div><button class="multi-page-tab-scroll multi-page-tab-scroll-next"' +
        ' type="button" data-page-scroll="right" aria-label="Прокрутить вкладки вправо"></button></div>' +
        '<div class="multi-page-header-actions"><button class="multi-page-menu-button icon-plus" type="button" data-page-menu-toggle aria-label="Добавить страницу"></button>' +
        menu + '</div></div><div class="multi-page-body">' + renderPage() + "</div></section>";
      if (root) root.innerHTML = html;
      return html;
    }

    function sync(patch) {
      var requestId = ++state.syncRequestId;
      if (typeof syncPages !== "function") { render(); return Promise.resolve(null); }
      return Promise.resolve(syncPages(Object.assign({
        opened_pages: state.opened_pages.slice(), main_page: state.main_page,
      }, patch || {}))).then(function (payload) {
        if (requestId === state.syncRequestId && payload) actions.setPages(payload);
        return payload;
      }).catch(function (error) {
        if (typeof config.reportError === "function") { config.reportError(error, "multi-page-sync"); return null; }
        throw error;
      });
    }

    function loadActive() {
      var id = activeId();
      var pageModule = registry[id] || {};
      var runtime;
      var requestId;
      if (!id || typeof pageModule.loadData !== "function") { render(); return Promise.resolve(null); }
      runtime = ensureRuntime(id); requestId = (state.requestIds[id] || 0) + 1; state.requestIds[id] = requestId;
      runtime.isready = false; render();
      return Promise.resolve(pageModule.loadData({ pageId: id, metadata: activeMetadata() })).then(function (payload) {
        if (state.requestIds[id] !== requestId) return null;
        state.runtime[id] = Object.assign({ data: null, isready: true, success: true, error: "" }, payload || {});
        render();
        if (!state.runtime[id].isready) schedulePoll();
        return payload;
      }).catch(function (error) {
        if (state.requestIds[id] === requestId) state.runtime[id] = {
          data: runtime.data, isready: true, success: false, error: String(error.message || error),
        };
        render(); return null;
      });
    }

    function schedulePoll() {
      window.clearTimeout(pollTimer);
      pollTimer = window.setTimeout(loadActive, Number(config.pollDelayMs) > 0 ? Number(config.pollDelayMs) : 750);
    }

    var actions = {
      setPages: function (payload) {
        var value = payload || {};
        state.pages = Array.isArray(value.pages) ? value.pages.slice() : state.pages;
        state.order = Array.isArray(value.order) ? value.order.slice() : state.order;
        state.opened_pages = Array.isArray(value.opened_pages) ? value.opened_pages.slice() : state.opened_pages;
        state.main_page = String(value.main_page || state.main_page || config.defaultPageId || "");
        render();
      },
      select: function (id) { state.main_page = String(id); render(); return sync({ main_page: state.main_page }).then(loadActive); },
      toggle: function (id, opened) {
        id = String(id); state.opened_pages = state.opened_pages.map(String).filter(function (value) { return value !== id; });
        if (opened) { state.opened_pages.push(id); state.main_page = id; }
        if (!state.opened_pages.length && config.defaultPageId) {
          state.opened_pages = [String(config.defaultPageId)];
        }
        if (!state.opened_pages.includes(String(state.main_page))) state.main_page = state.opened_pages[0] || "";
        render(); return sync();
      },
      close: function (id) { return actions.toggle(id, false); },
      toggleMenu: function (rect) {
        state.pageMenuOpen = !state.pageMenuOpen;
        if (state.pageMenuOpen && rect) {
          state.pageMenuStyle = "top:" + (rect.bottom + 6) + "px;right:" + Math.max(8, window.innerWidth - rect.right) + "px";
        }
        render();
      },
      loadActive: loadActive,
    };

    function onClick(event) {
      var node;
      var toggle = event.target.closest("[data-page-menu-toggle]");
      if (toggle) return actions.toggleMenu(toggle.getBoundingClientRect());
      node = event.target.closest("[data-page-close]"); if (node) { event.stopPropagation(); return actions.close(node.getAttribute("data-page-close")); }
      node = event.target.closest("[data-page-select]"); if (node) return actions.select(node.getAttribute("data-page-select"));
      node = event.target.closest("[data-page-scroll]");
      if (node) {
        var tabs = root.querySelector("[data-multi-page-tabs]");
        if (tabs) tabs.scrollBy({ left: node.getAttribute("data-page-scroll") === "left" ? -240 : 240, behavior: "smooth" });
      }
    }
    function onChange(event) {
      var id = event.target.getAttribute("data-page-visible");
      if (id != null) actions.toggle(id, event.target.checked);
    }
    function onDocumentClick(event) {
      if (state.pageMenuOpen && !event.target.closest("[data-multi-page-menu],[data-page-menu-toggle]")) {
        state.pageMenuOpen = false; render();
      }
    }
    function mount(element) {
      if (!element) throw new Error("Multi-page mount root is required"); if (root) unmount(); root = element;
      root.addEventListener("click", onClick); root.addEventListener("change", onChange);
      window.document.addEventListener("click", onDocumentClick); render(); loadActive(); return module;
    }
    function unmount() {
      window.clearTimeout(pollTimer); pollTimer = null;
      if (!root) return; root.removeEventListener("click", onClick); root.removeEventListener("change", onChange);
      window.document.removeEventListener("click", onDocumentClick);
      root.innerHTML = ""; root = null;
    }
    var module = { state: state, actions: actions, render: render, mount: mount, unmount: unmount };
    return module;
  }

  window.GenieMultiPageElement = { create: createMultiPageElement };
})(window);

(function registerGenieMultiPageElement(window, document) {
  "use strict";

  var MissingPage = {
    template: '<div class="multi-page-missing">Frontend module страницы не зарегистрирован</div>',
  };

  function createMultiPageElement(options) {
    var config = options || {};
    var defaultPageId = String(config.defaultPageId || "");
    var pageRegistry = config.pages || {};
    var syncPages = typeof config.syncPages === "function" ? config.syncPages : function () {
      return Promise.reject(new Error("Multi-page syncPages action is not configured"));
    };
    var pollDelay = Number(config.pollDelayMs) > 0 ? Number(config.pollDelayMs) : 750;

    return {
      state: function () {
        return {
          multiPageUi: {
            title: config.title || "",
            tabsCanScrollLeft: false,
            tabsCanScrollRight: false,
            pageMenuOpen: false,
            pageMenuStyle: {},
            pageRuntime: {},
            syncRequestId: 0,
            loadRequestIds: {},
            pollTimers: {},
          },
        };
      },
      computed: {
        multiPageState: function () {
          return this.multiPage || {
            pages: [],
            order: [],
            opened_pages: [],
            main_page: "",
          };
        },
        orderedPageMetadata: function () {
          var pages = Array.isArray(this.multiPageState.pages) ? this.multiPageState.pages : [];
          var order = Array.isArray(this.multiPageState.order) ? this.multiPageState.order : [];
          var byId = {};
          pages.forEach(function (page) {
            byId[String(page.id)] = page;
          });
          return order.map(function (id) {
            return byId[String(id)];
          }).filter(Boolean);
        },
        openedPageMetadata: function () {
          var opened = (this.multiPageState.opened_pages || []).map(String);
          return this.orderedPageMetadata.filter(function (page) {
            return opened.includes(String(page.id));
          });
        },
        activePageId: function () {
          var mainPage = String(this.multiPageState.main_page || "");
          if (this.openedPageMetadata.some(function (page) { return String(page.id) === mainPage; })) {
            return mainPage;
          }
          return this.openedPageMetadata.length ? String(this.openedPageMetadata[0].id) : defaultPageId;
        },
        activePageMetadata: function () {
          var activeId = this.activePageId;
          return this.orderedPageMetadata.find(function (page) {
            return String(page.id) === activeId;
          }) || null;
        },
        activePageModule: function () {
          return pageRegistry[this.activePageId] || {};
        },
        activePageComponent: function () {
          return this.activePageModule.component || MissingPage;
        },
        activePageRendersOutputState: function () {
          return this.activePageModule.rendersOutputState === true;
        },
        activePageRuntime: function () {
          return this.multiPageUi.pageRuntime[this.activePageId] || {
            data: null,
            isready: true,
            success: true,
            error: "",
          };
        },
        activePageLoading: function () {
          return this.activePageRuntime.isready === false;
        },
        activePageError: function () {
          return this.activePageRuntime.isready === true && this.activePageRuntime.success === false ?
            String(this.activePageRuntime.error || "Не удалось получить данные страницы") :
            "";
        },
        pageMenuSections: function () {
          var sections = [];
          var byKey = {};
          this.orderedPageMetadata.forEach(function (page) {
            var key = String(page.menu_group || "");
            if (!byKey[key]) {
              byKey[key] = { title: key, pages: [] };
              sections.push(byKey[key]);
            }
            byKey[key].pages.push(page);
          });
          return sections;
        },
      },
      watch: {
        "multiPage.opened_pages": function () {
          this.$nextTick(this.updateMultiPageTabsScroll);
        },
        "multiPage.main_page": function () {
          this.activateCurrentPage();
        },
      },
      methods: {
        ensurePageRuntime: function (pageId) {
          var id = String(pageId || "");
          var pageModule = pageRegistry[id] || {};
          var runtime = this.multiPageUi.pageRuntime[id];
          var nextRuntime;

          if (runtime) return runtime;
          nextRuntime = { data: null, isready: true, success: true, error: "" };
          this.multiPageUi.pageRuntime = Object.assign({}, this.multiPageUi.pageRuntime, {
            [id]: nextRuntime,
          });
          return nextRuntime;
        },
        setPageRuntime: function (pageId, patch) {
          var id = String(pageId || "");
          var runtime = Object.assign({}, this.ensurePageRuntime(id), patch || {});
          this.multiPageUi.pageRuntime = Object.assign({}, this.multiPageUi.pageRuntime, {
            [id]: runtime,
          });
          return runtime;
        },
        clearPagePollTimer: function (pageId) {
          var id = String(pageId || "");
          var timers = Object.assign({}, this.multiPageUi.pollTimers || {});
          if (timers[id]) window.clearTimeout(timers[id]);
          delete timers[id];
          this.multiPageUi.pollTimers = timers;
        },
        schedulePagePoll: function (pageId) {
          var self = this;
          var id = String(pageId || "");
          var timers;

          this.clearPagePollTimer(id);
          if (id !== this.activePageId) return;
          timers = Object.assign({}, this.multiPageUi.pollTimers || {});
          timers[id] = window.setTimeout(function () {
            self.clearPagePollTimer(id);
            if (id === self.activePageId) self.loadPageData(id);
          }, pollDelay);
          this.multiPageUi.pollTimers = timers;
        },
        loadPageData: function (pageId) {
          var self = this;
          var id = String(pageId || "");
          var pageModule = pageRegistry[id] || {};
          var requestIds;
          var requestId;

          this.clearPagePollTimer(id);
          if (typeof pageModule.loadData !== "function") {
            this.setPageRuntime(id, { isready: true, success: true, error: "" });
            return Promise.resolve(null);
          }

          requestIds = Object.assign({}, this.multiPageUi.loadRequestIds || {});
          requestId = Number(requestIds[id] || 0) + 1;
          requestIds[id] = requestId;
          this.multiPageUi.loadRequestIds = requestIds;
          return Promise.resolve()
            .then(function () {
              return pageModule.loadData.call(self, id);
            })
            .then(function (payload) {
              if (self.multiPageUi.loadRequestIds[id] !== requestId) return null;
              self.setPageRuntime(id, {
                data: payload.data,
                isready: payload.isready === true,
                success: payload.success === true,
                error: String(payload.error || ""),
              });
              if (payload.isready !== true && id === self.activePageId) {
                self.schedulePagePoll(id);
              }
              return payload;
            })
            .catch(function (error) {
              if (self.multiPageUi.loadRequestIds[id] !== requestId) return null;
              self.setPageRuntime(id, { isready: true, success: true, error: "" });
              if (typeof self.showFrontendError === "function") {
                self.showFrontendError(error);
                return null;
              }
              throw error;
            });
        },
        activateCurrentPage: function () {
          var activeId = this.activePageId;
          var timers = this.multiPageUi.pollTimers || {};
          var self = this;
          Object.keys(timers).forEach(function (pageId) {
            if (pageId !== activeId) self.clearPagePollTimer(pageId);
          });
          this.ensurePageRuntime(activeId);
          this.$nextTick(function () {
            self.updateMultiPageTabsScroll();
            self.scrollActiveTabIntoView();
          });
          return this.loadPageData(activeId);
        },
        syncMultiPageView: function () {
          var self = this;
          var requestId = this.multiPageUi.syncRequestId + 1;
          var payload = {
            opened_pages: (this.multiPageState.opened_pages || []).slice(),
            main_page: this.multiPageState.main_page,
          };
          this.multiPageUi.syncRequestId = requestId;

          return Promise.resolve()
            .then(function () {
              return syncPages.call(self, payload);
            })
            .then(function (response) {
              if (self.multiPageUi.syncRequestId !== requestId) return null;
              if (response && response.multi_page) self.multiPage = response.multi_page;
              return response;
            })
            .catch(function (error) {
              if (self.multiPageUi.syncRequestId !== requestId) return null;
              if (typeof self.showFrontendError === "function") {
                self.showFrontendError(error);
                return null;
              }
              throw error;
            });
        },
        selectMultiPage: function (pageId) {
          var id = String(pageId || "");
          if (id === this.activePageId) return;
          this.multiPage.main_page = id;
          this.syncMultiPageView();
        },
        toggleMultiPage: function (pageId, opened) {
          var id = String(pageId || "");
          var currentOpened = (this.multiPageState.opened_pages || []).map(String);
          var nextOpened = currentOpened.slice();
          var nextMain = this.activePageId;

          if (opened && !nextOpened.includes(id)) nextOpened.push(id);
          if (!opened) nextOpened = nextOpened.filter(function (item) { return item !== id; });
          if (!nextOpened.length) nextOpened = [defaultPageId];
          nextOpened = this.orderedPageMetadata.map(function (page) {
            return String(page.id);
          }).filter(function (item) {
            return nextOpened.includes(item);
          });

          if (opened) {
            nextMain = id;
          } else if (!nextOpened.includes(nextMain)) {
            nextMain = nextOpened[0];
          }

          this.multiPage.opened_pages = nextOpened;
          this.multiPage.main_page = nextMain;
          this.syncMultiPageView();
        },
        closeMultiPage: function (page) {
          if (!page || page.closable === false) return;
          this.toggleMultiPage(page.id, false);
        },
        refreshActiveMultiPageOutput: function () {
          return this.activateCurrentPage();
        },
        multiPageTabsElement: function () {
          return this.$refs && this.$refs.multiPageTabs ? this.$refs.multiPageTabs : null;
        },
        updateMultiPageTabsScroll: function () {
          var tabs = this.multiPageTabsElement();
          var maxScroll;
          if (!tabs) return;
          maxScroll = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
          this.multiPageUi.tabsCanScrollLeft = tabs.scrollLeft > 1;
          this.multiPageUi.tabsCanScrollRight = tabs.scrollLeft < maxScroll - 1;
        },
        scrollMultiPageTabs: function (direction) {
          var tabs = this.multiPageTabsElement();
          var delta;
          if (!tabs) return;
          delta = Math.max(160, Math.floor(tabs.clientWidth * 0.7));
          tabs.scrollBy({ left: direction === "left" ? -delta : delta, behavior: "smooth" });
          window.setTimeout(this.updateMultiPageTabsScroll, 180);
        },
        scrollActiveTabIntoView: function () {
          var tabs = this.multiPageTabsElement();
          var active = tabs && tabs.querySelector ? tabs.querySelector(".multi-page-tab.active") : null;
          if (active && typeof active.scrollIntoView === "function") {
            active.scrollIntoView({ block: "nearest", inline: "nearest" });
          }
        },
        toggleMultiPageMenu: function (event) {
          var button = event && event.currentTarget;
          var rect = button && button.getBoundingClientRect ? button.getBoundingClientRect() : null;
          this.multiPageUi.pageMenuOpen = !this.multiPageUi.pageMenuOpen;
          if (this.multiPageUi.pageMenuOpen && rect) {
            this.multiPageUi.pageMenuStyle = {
              position: "fixed",
              top: Math.round(rect.bottom + 6) + "px",
              right: Math.round(Math.max(8, window.innerWidth - rect.right)) + "px",
            };
          }
        },
        closeMultiPageMenu: function () {
          this.multiPageUi.pageMenuOpen = false;
          this.multiPageUi.pageMenuStyle = {};
        },
        handleMultiPageDocumentClick: function (event) {
          var target = event.target;
          if (!target || typeof target.closest !== "function") return;
          if (target.closest("[data-multi-page-menu]") ||
              target.closest("[data-multi-page-menu-toggle]")) return;
          this.closeMultiPageMenu();
        },
      },
      mounted: function () {
        var self = this;
        this.orderedPageMetadata.forEach(function (page) {
          self.ensurePageRuntime(page.id);
        });
        window.addEventListener("resize", this.updateMultiPageTabsScroll);
        document.addEventListener("mousedown", this.handleMultiPageDocumentClick);
        this.activateCurrentPage();
      },
      beforeUnmount: function () {
        var self = this;
        Object.keys(this.multiPageUi.pollTimers || {}).forEach(function (pageId) {
          self.clearPagePollTimer(pageId);
        });
        window.removeEventListener("resize", this.updateMultiPageTabsScroll);
        document.removeEventListener("mousedown", this.handleMultiPageDocumentClick);
      },
    };
  }

  window.GenieMultiPageElement = {
    create: createMultiPageElement,
  };
})(window, document);

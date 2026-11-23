(function () {
  var splitActive = false;
  var activeDoctype = null;

  function isListView() {
    var route = frappe.get_route ? frappe.get_route() : [];
    return route && route[0] === 'List' && route[1];
  }

  function closeSplitPane() {
    splitActive = false;
    document.body.classList.remove('stt-split-active');
    var resizer = document.getElementById('stt-split-resizer');
    if (resizer) resizer.remove();
    var rightPane = document.getElementById('stt-split-right-pane');
    if (rightPane) rightPane.remove();

    var leftPane = document.querySelector('.page-container:not([style*="display: none"]) .layout-main-section-wrapper');
    if (leftPane) {
      leftPane.style.removeProperty('flex');
      leftPane.style.removeProperty('max-width');
      leftPane.style.removeProperty('width');
    }

    var btn = document.getElementById('stt-split-toggle-btn');
    if (btn) {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-default');
      btn.innerHTML = '&#9707; Split View';
    }
  }

  function loadRecordInRightPane(doctype, name) {
    var rightPane = document.getElementById('stt-split-right-pane');
    if (!rightPane) return;

    var titleEl = rightPane.querySelector('#stt-split-doc-title');
    var openFullEl = rightPane.querySelector('#stt-split-open-full');
    var iframe = rightPane.querySelector('#stt-split-iframe');

    var slug = frappe.router.slug(doctype);
    var formUrl = '/app/' + slug + '/' + encodeURIComponent(name);

    if (titleEl) titleEl.textContent = doctype + ': ' + name;
    if (openFullEl) openFullEl.href = formUrl;

    if (iframe) {
      iframe.src = formUrl;
      iframe.onload = function () {
        try {
          var idoc = iframe.contentDocument || iframe.contentWindow.document;
          if (!idoc) return;
          var style = idoc.createElement('style');
          style.textContent =
            'header.navbar, .layout-side-section, .body-sidebar-container, .app-sidebar { display: none !important; }' +
            '.main-section { margin-left: 0 !important; padding-top: 0 !important; }' +
            '.page-head { top: 0 !important; }';
          idoc.head.appendChild(style);
        } catch (err) {}
      };
    }

    document.querySelectorAll('.list-row-container').forEach(function (row) {
      row.classList.remove('stt-split-selected-row');
    });
    var activeLink = document.querySelector('.list-row-container a[data-name="' + CSS.escape(name) + '"]');
    if (activeLink && activeLink.closest('.list-row-container')) {
      activeLink.closest('.list-row-container').classList.add('stt-split-selected-row');
    }
  }

  function bindResizer(layoutMain, leftPane, resizer, iframe) {
    var dragging = false;

    resizer.addEventListener('mousedown', function (e) {
      e.preventDefault();
      dragging = true;
      resizer.classList.add('stt-dragging');
      document.body.style.cursor = 'col-resize';
      if (iframe) iframe.style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging || !splitActive) return;
      var rect = layoutMain.getBoundingClientRect();
      if (!rect.width) return;

      var pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(22, Math.min(72, pct));

      leftPane.style.setProperty('flex', '0 0 ' + pct.toFixed(2) + '%', 'important');
      leftPane.style.setProperty('max-width', pct.toFixed(2) + '%', 'important');
      try {
        localStorage.setItem('stt_split_left_pct', pct.toFixed(2));
      } catch (err) {}
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('stt-dragging');
      document.body.style.removeProperty('cursor');
      if (iframe) iframe.style.removeProperty('pointer-events');
    });
  }

  function openSplitPane(doctype, initialDocName) {
    splitActive = true;
    activeDoctype = doctype;
    document.body.classList.add('stt-split-active');

    var btn = document.getElementById('stt-split-toggle-btn');
    if (btn) {
      btn.classList.remove('btn-default');
      btn.classList.add('btn-primary');
      btn.innerHTML = '&#9707; Exit Split';
    }

    var layoutMain = document.querySelector('.page-container:not([style*="display: none"]) .layout-main');
    if (!layoutMain) return;

    var leftPane = layoutMain.querySelector('.layout-main-section-wrapper');
    var savedPct = '40';
    try {
      savedPct = localStorage.getItem('stt_split_left_pct') || '40';
    } catch (err) {}

    if (leftPane) {
      leftPane.style.setProperty('flex', '0 0 ' + savedPct + '%', 'important');
      leftPane.style.setProperty('max-width', savedPct + '%', 'important');
    }

    var resizer = document.getElementById('stt-split-resizer');
    if (!resizer) {
      resizer = document.createElement('div');
      resizer.id = 'stt-split-resizer';
      resizer.className = 'stt-split-resizer';
      resizer.title = 'Drag to resize panes';
      resizer.innerHTML = '<div class="stt-split-grip"></div>';
      layoutMain.appendChild(resizer);
    }

    var rightPane = document.getElementById('stt-split-right-pane');
    if (!rightPane) {
      rightPane = document.createElement('div');
      rightPane.id = 'stt-split-right-pane';
      rightPane.className = 'stt-split-right-pane';
      rightPane.innerHTML =
        '<div class="stt-split-header">' +
        '  <span id="stt-split-doc-title" class="font-weight-bold">Select a record on the left</span>' +
        '  <div class="d-flex align-items-center" style="gap:8px;">' +
        '    <a id="stt-split-open-full" href="#" class="btn btn-xs btn-default" title="Open Full Screen">Full Screen &#8599;</a>' +
        '    <button type="button" id="stt-split-close-btn" class="btn btn-xs btn-default" title="Close Split View">&times;</button>' +
        '  </div>' +
        '</div>' +
        '<iframe id="stt-split-iframe" src="about:blank"></iframe>';
      layoutMain.appendChild(rightPane);

      rightPane.querySelector('#stt-split-close-btn').addEventListener('click', closeSplitPane);
      bindResizer(layoutMain, leftPane, resizer, rightPane.querySelector('#stt-split-iframe'));
    }

    var targetName = initialDocName;
    if (!targetName) {
      var firstLink = layoutMain.querySelector('.list-row-container a[data-name]');
      if (firstLink) targetName = firstLink.getAttribute('data-name');
    }
    if (targetName) {
      loadRecordInRightPane(doctype, targetName);
    }
  }

  function injectSplitButton() {
    if (!isListView()) {
      if (splitActive) closeSplitPane();
      return;
    }

    var route = frappe.get_route();
    var doctype = route[1];
    if (splitActive && activeDoctype !== doctype) {
      closeSplitPane();
    }

    var pageContainer = document.querySelector('.page-container:not([style*="display: none"])');
    if (!pageContainer) return;

    var actionsWrap = pageContainer.querySelector('.page-head .standard-actions');
    if (!actionsWrap || actionsWrap.querySelector('#stt-split-toggle-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'stt-split-toggle-btn';
    btn.type = 'button';
    btn.className = 'btn btn-default btn-sm ml-2';
    btn.innerHTML = '&#9707; Split View';
    btn.addEventListener('click', function () {
      if (splitActive) {
        closeSplitPane();
      } else {
        openSplitPane(doctype, null);
      }
    });

    actionsWrap.prepend(btn);
  }

  document.addEventListener(
    'click',
    function (e) {
      if (!splitActive || !isListView()) return;
      if (e.target.closest('.list-row-checkbox, .list-row-like, .stt-split-right-pane, .stt-split-resizer')) return;

      var row = e.target.closest('.list-row-container');
      if (!row) return;

      var link = row.querySelector('a[data-name]');
      if (!link) return;

      var docName = link.getAttribute('data-name');
      if (!docName) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      loadRecordInRightPane(activeDoctype, docName);
    },
    true
  );

  $(document).on('page-change', function () {
    setTimeout(injectSplitButton, 200);
    setTimeout(injectSplitButton, 600);
  });

  frappe.ready(function () {
    setTimeout(injectSplitButton, 300);
    setTimeout(injectSplitButton, 900);
  });
})();

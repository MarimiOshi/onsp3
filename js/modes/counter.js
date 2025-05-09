// js/modes/counter.js

const CounterMode = {
    elements: { section: null, decreaseModeButton: null, counterGrid: null, },
    state: { isActive: false, isDecreaseMode: false, counts: {}, },
    config: { members: [], },
    dependencies: { storage: null, utils: null, domUtils: null, },

    init: function(appInstance, initialConfig) {
        this.dependencies.storage = StorageService; this.dependencies.utils = Utils; this.dependencies.domUtils = DOMUtils;
        console.log("Initializing Counter Mode...");
        this.elements.section = this.dependencies.domUtils.qs('#counterSection');
        this.elements.decreaseModeButton = this.dependencies.domUtils.qs('#decreaseModeButton');
        this.elements.counterGrid = this.dependencies.domUtils.qs('#counterGrid');
        if (initialConfig.members) this.config.members = initialConfig.members;
        this.loadCounts(); this.renderCounterGrid(); this.addEventListeners(); this.updateDecreaseModeButtonUI();
        console.log("Counter Mode Initialized.");
    },
    addEventListeners: function() {
        if(this.elements.decreaseModeButton) this.dependencies.domUtils.on(this.elements.decreaseModeButton, 'click', () => this.toggleDecreaseMode());
    },
    loadCounts: function() {
        this.state.counts = this.dependencies.storage.loadCounterData();
        const validMemberNames = new Set((this.config.members || []).map(m => m.name));
        for (const memberName in this.state.counts) if (!validMemberNames.has(memberName)) delete this.state.counts[memberName];
    },
    saveCounts: function() { this.dependencies.storage.saveCounterData(this.state.counts); },
    renderCounterGrid: function() {
        if (!this.elements.counterGrid || !this.config.members) return;
        this.dependencies.domUtils.empty(this.elements.counterGrid);
        if (this.config.members.length === 0) {
            this.elements.counterGrid.appendChild(this.dependencies.domUtils.createElement('p', { class: 'loading-message' }, ['メンバー情報がありません。']));
            return;
        }
        this.config.members.forEach(member => {
            if (!member || !member.name) return;
            const memberName = member.name; const count = this.state.counts[memberName] || 0;
            const img = this.dependencies.domUtils.createElement('img', { src: `images/count/${memberName}.jpg`, alt: memberName, loading: 'lazy' });
            this.dependencies.domUtils.on(img, 'error', (e) => { e.target.src = 'images/placeholder.png'; this.dependencies.domUtils.addClass(e.target, 'image-error'); });
            const nameSpan = this.dependencies.domUtils.createElement('span', { class: 'counter-member-name' }, [memberName]);
            const countSpan = this.dependencies.domUtils.createElement('span', { class: 'count-number' }, [String(count)]);
            if (member.color) { img.style.borderColor = member.color; countSpan.style.color = member.color; }
            const item = this.dependencies.domUtils.createElement('div', { class: 'counter-item', dataset: { memberName: memberName }, tabindex: '0' }, [img, nameSpan, countSpan]);
            this.dependencies.domUtils.on(item, 'click', (event) => this.handleCounterClick(event));
            this.dependencies.domUtils.on(item, 'keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.handleCounterClick(event); } });
            this.elements.counterGrid.appendChild(item);
        });
    },
    handleCounterClick: function(event) {
        const itemElement = event.currentTarget; const memberName = itemElement.dataset.memberName; if (!memberName) return;
        let currentCount = this.state.counts[memberName] || 0;
        if (this.state.isDecreaseMode) { if (currentCount > 0) currentCount--; } else currentCount++;
        this.state.counts[memberName] = currentCount; this.saveCounts();
        const countSpan = this.dependencies.domUtils.qs('.count-number', itemElement);
        if (countSpan) this.dependencies.domUtils.setText(countSpan, String(currentCount));
        this.dependencies.domUtils.addClass(itemElement, 'clicked');
        setTimeout(() => { this.dependencies.domUtils.removeClass(itemElement, 'clicked'); }, 150);
    },
    toggleDecreaseMode: function() { this.state.isDecreaseMode = !this.state.isDecreaseMode; this.updateDecreaseModeButtonUI(); },
    updateDecreaseModeButtonUI: function() {
        if (this.elements.decreaseModeButton) {
            this.dependencies.domUtils.setText(this.elements.decreaseModeButton, `減らすモード ${this.state.isDecreaseMode ? 'ON' : 'OFF'}`);
            this.dependencies.domUtils.toggleClass(this.elements.decreaseModeButton, 'decrease-mode-active', this.state.isDecreaseMode);
        }
    },
    incrementCount: function(memberName) {
        if (!(this.config.members || []).find(m => m.name === memberName)) { console.warn(`Counter: Member "${memberName}" not found for increment.`); return; }
        let currentCount = this.state.counts[memberName] || 0; currentCount++; this.state.counts[memberName] = currentCount; this.saveCounts();
        if (this.state.isActive) {
            const itemElement = this.dependencies.domUtils.qs(`.counter-item[data-member-name="${memberName}"]`, this.elements.counterGrid);
            if (itemElement) {
                const countSpan = this.dependencies.domUtils.qs('.count-number', itemElement);
                if (countSpan) this.dependencies.domUtils.setText(countSpan, String(currentCount));
            }
        }
        console.log(`Counter: Incremented count for ${memberName} to ${currentCount}`);
    },
    activate: function() {
        this.state.isActive = true;
        if (this.elements.section) {
            this.dependencies.domUtils.addClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, true);
        }
        this.loadCounts(); this.renderCounterGrid();
        console.log("Counter Mode Activated.");
    },
    deactivate: function() {
        this.state.isActive = false;
        if (this.elements.section) {
            this.dependencies.domUtils.removeClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, false);
        }
        console.log("Counter Mode Deactivated.");
    }
};

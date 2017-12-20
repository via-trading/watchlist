const {Emitter, CompositeDisposable, Disposable} = require('via');
const _ = require('underscore-plus');
const SymbolExplorerURI = 'via://symbol-explorer';
const SymbolExplorerCategory = require('./symbol-explorer-category');
const SymbolExplorerCategoryView = require('./symbol-explorer-category-view');

module.exports = class SymbolExplorer {
    constructor(state = {}) {
        this.emitter = new Emitter();
        this.disposables = new CompositeDisposable();
        this.roots = new Map();
        this.selectedSymbolExplorerItem = null;
        this.currentlyOpening = new Map();
        this.dragEventCounts = new WeakMap();

        this.element = document.createElement('div');
        this.element.classList.add('tool-panel', 'focusable-panel', 'symbol-explorer');
        this.element.tabIndex = -1;

        this.list = document.createElement('ul');
        this.list.classList.add('full-menu', 'list-tree', 'has-collapsable-children');
        this.element.appendChild(this.list);

        this.handleEvents();

        if(state.width && state.width > 0){
            this.element.style.width = `${state.width}px`;
        }
    }

    handleEvents(){
        this.disposables.add(via.symbols.onDidUpdateCategories(this.didUpdateCategories.bind(this)));
        // this.disposables.add(via.symbols.observeSymbols(this.didAddSymbol.bind(this)));

        this.element.addEventListener('click', e => {
            if(e.target.classList.contains('entries')){
                return;
            }

            if(!e.shiftKey && !e.metaKey && !e.ctrlKey){
                this.entryClicked(e);
            }
        });
    }

    destroy(){
        this.disposables.dispose();
        this.emitter.emit('did-destroy');
    }

    isSubCategory(path){
        return path.indexOf('/') !== -1;
    }

    categoryExists(path){
        return this.roots.has(path.split('/').shift());
    }

    didUpdateCategories(categories){
        for(let path of categories){
            if(this.categoryExists(path)){
                continue;
            }

            let category = new SymbolExplorerCategory({path, explorer: this, isRoot: true});
            let root = new SymbolExplorerCategoryView(category);

            this.list.appendChild(root.element);
            this.roots.set(path, root);
        }
    }

    didAddSymbol(symbol){
        for(let path of symbol.categories){
            if(this.categoryExists(path)){
                continue;
            }

            let category = new SymbolExplorerCategory({path, explorer: this, isRoot: true});
            let root = new SymbolExplorerCategoryView(category);

            this.list.appendChild(root.element);
            this.roots.set(path, root);
        }
    }

    getTitle(){
        return 'Symbol Explorer';
    }

    getURI(){
        return SymbolExplorerURI;
    }

    getDefaultLocation(){
        return 'left';
    }

    getPreferredLocation(){
        return via.config.get('watchlist.showOnRightSide') ? 'right' : 'left';
    }

    isPermanentDockItem(){
        return true;
    }

    getAllowedLocations(){
        return ['left', 'right', 'bottom'];
    }

    entryClicked(e){
        let entry = e.target.closest('.entry');

        if(entry){
            this.selectEntry(entry);

            if(entry.classList.contains('category')){
                entry.toggleExpansion()
            }else if(entry.classList.contains('symbol')){
                this.symbolViewEntryClicked(e);
            }
        }
    }

    symbolViewEntryClicked(e){
        let symbol = e.target.closest('.entry').getSymbol();
        let detail = e.detail || 1;
        let alwaysOpenExisting = via.config.get('watchlist.alwaysOpenExisting');

        if(detail === 1){
            //Set the active symbol
        }else if(detail === 2){
            if(typeof symbol.openDefaultLocation === 'function'){
                symbol.openDefaultLocation();
            }else{
                via.workspace.open(`via://charts/${symbol.identifier}`, {});
            }
        }
    }

    selectedEntry(){
        return this.list.querySelector('.selected');
    }

    selectEntry(entry){
        if(!entry){
            return;
        }

        this.selectedPath = entry.getPath();

        let selectedEntries = this.getSelectedEntries();

        if(selectedEntries.length > 1 || selectedEntries[0] !== entry){
            this.deselect(selectedEntries);
            entry.classList.add('selected');
        }

        return entry;
    }

    getSelectedEntries(){
        return this.list.querySelectorAll('.selected');
    }

    deselect(elementsToDeselect = this.getSelectedEntries()){
        for(let selected of elementsToDeselect){
            selected.classList.remove('selected');
        }
    }

    scrollTop(top){
        if(top){
            this.element.scrollTop = top;
        }else{
            return this.element.scrollTop;
        }
    }

    scrollBottom(bottom){
        if(bottom){
            this.element.scrollTop = bottom - this.element.offsetHeight;
        }else{
            this.element.scrollTop + this.element.offsetHeight;
        }
    }

    scrollToEntry(entry, center = true){
        let element = (entry && entry.classList.contains('directory')) ? entry.header : entry;

        if(element){
            element.scrollIntoViewIfNeeded(center);
        }
    }

    scrollToBottom(){
        let lastEntry = _.last(this.list.querySelectorAll('.entry'));

        if(lastEntry){
            this.selectEntry(lastEntry)
            this.scrollToEntry(lastEntry);
        }
    }

    scrollToTop(){
        // this.selectEntry(this.[0]) if @roots[0]?
        this.element.scrollTop = 0;
    }

    pageUp(){
        this.element.scrollTop -= this.element.offsetHeight;
    }

    pageDown(){
        this.element.scrollTop += this.element.offsetHeight;
    }

    onStylesheetsChanged(){
        if(this.isVisible()){
            this.element.style.display = 'none';
            this.element.offsetWidth;
            this.element.style.display = '';
        }
    }

    isVisible(){
        return this.element.offsetWidth || this.element.offsetHeight;
    }

    onDidAddSymbol(callback){
        return this.emitter.on('did-remove-symbol', callback);
    }

    onDidRemoveSymbol(callback){
        return this.emitter.on('did-remove-symbol', callback);
    }

    onDidDestroy(callback){
        return this.emitter.on('did-destroy', callback);
    }
}
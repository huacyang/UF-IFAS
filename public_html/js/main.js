/*
Derived from Derek Lu's 
http://www.adobe.com/devnet/digitalpublishingsuite/articles/getting-started-with-v2-library-and-store-api.html
*/

$(document).ready(function() {  
    console.log("doc ready",  this);
    adobeDPS.initializationComplete.addOnce(displayLibrary, this);
});
    
function displayLibrary() {
    console.log("DPS object ready", adobeDPS);    
    console.log("Initializing library...", adobeDPS.libraryService.folioMap);
    
    // Sort the folios descending.
    var list = adobeDPS.libraryService.folioMap.sort(function (a, b) {
        if (a.publicationDate < b.publicationDate)
            return 1;
        else if (a.publicationDate > b.publicationDate)
            return -1;
        else
            return 0;
    });

    // list is an associative array so put them in a regular array.
    for (var i in list) {
        var folio = list[i];
        new FolioView(folio);
    }

    // Add a listener for when folios are added. This does not correspond to when
    // a new folio is pushed rather when the viewer is aware of new folios.
    adobeDPS.libraryService.folioMap.addedSignal.add(function(folios) {
        for (var i = 0; i < folios.length; i++) {
            new FolioView(folios[i]);
        }
    }, this);

    //jQuery.getScript("js/app.js");
    //jQuery.getScript("js/main.js");
}

// Object to handle the view of each folio.
function FolioView(folio) {
    
    console.log("Adding folio:",  folio);
    
    var productId = folio.productId;
    var filter = folio.filter;
    
    var html  = "<div id='" + productId + "' class='folioView'>";
        html +=     "<img class='folioImg' src='" + folio.previewImageURL + "' />";
        html +=     "<div class='folioInfo'>"
        html +=     "<div class='folioNum'>&#35; " + folio.folioNumber + "</div>";
        html +=     "<div class='folioTitle'>" + folio.title + "</div>";
        html +=     "<div class='folioDesc'>" + folio.folioDescription + "</div>";
        html +=     "<div class='buy-button'></div>";
        html +=     "<div class='archive-button'>Archive</div>";    
        html +=     "<div class='download-amount'></div>";
        html +=     "<div class='state'></div>";    
        html +=     "</div>";
        html += "</div>";
    
    this.$el = $(html);
    
    // Add the element to the body.
    //$("body").append(this.$el);

    if (filter == 'ifas') {
        $("#issue-ifas").append(this.$el);
    } else if (filter == 'cas') {
        $("#issue-cas").append(this.$el);
    } else if (filter == 'research') {
        $("#issue-research").append(this.$el);
    } else {
        $("#issue-extension").append(this.$el);
    }
    
    this.$downloadAmount = this.$el.find(".download-amount");
    this.$state = this.$el.find(".state");
    this.$buyButton = this.$el.find(".buy-button");
    this.$archiveButton = this.$el.find(".archive-button");
    this.$img = this.$el.find(".folioImg");
    
    this.folio = folio;
    this.folio.updatedSignal.add(this.updatedSignalHandler, this);
    
    // Determine if the folio was in the middle of downloading.
    // If the folio is downloading then find the paused transaction and resume.
    if (this.folio.state == adobeDPS.libraryService.folioStates.DOWNLOADING) {
        var transactions = this.folio.currentTransactions;
        var len = transactions.length;
        for (var i = 0; i < len; i++) {
            var transaction = transactions[i];
            if (transaction.state == adobeDPS.transactionManager.transactionStates.PAUSED) {
                transaction.resume();
                break;
            }
        }
    }
    
    var scope = this;
    this.$buyButton.on("click", function() { scope.buyButton_clickHandler() });
    this.$archiveButton.on("click", function() { scope.archiveButton_clickHandler() });
    
    this.updateView();
    
        
    this.getPreviewImageHandler = function(transaction) {
        console.log("getPreviewImageHandler ", transaction);
        if (transaction.state == adobeDPS.transactionManager.transactionStates.FINISHED && transaction.previewImageURL != null) {
            this.$img.attr("src", transaction.previewImageURL);
            this.$el.addClass("appear");
        } else if (transaction.previewImageURL == null) { // Sometimes previewImageURL is null so attempt another reload.
            console.log("unable to load preview URL");
        }
    };
    
    var transaction = this.folio.getPreviewImage(135, 180, true);
    console.log("getPreviewImage", transaction);
    transaction.completedSignal.addOnce(this.getPreviewImageHandler, this);
            
}

FolioView.prototype.updatedSignalHandler = function(properties) {
    this.updateView();
    
    // The buy button is disabled before downloading so if it is made viewable
    // during the download then enable it again. 
    if (properties.indexOf("isViewable") > -1 && this.folio.isViewable)
        this.enableBuyButton(true);
        
    // If there is a current transaction then start tracking it.
    if ((properties.indexOf("state") > -1 || properties.indexOf("currentTransactions") > -1) && this.folio.currentTransactions.length > 0)
        this.trackTransaction();
}

FolioView.prototype.updateView = function(properties) {
    var label = "";
    var state = "";

    switch (this.folio.state) {
        case adobeDPS.libraryService.folioStates.INVALID:
            state = "Invalid";
            label = "ERROR";
            break;
        case adobeDPS.libraryService.folioStates.UNAVAILABLE:
            state = "Unavailable";
            label = "ERROR";
            break;
        case adobeDPS.libraryService.folioStates.PURCHASABLE:
            label = "BUY " + this.folio.price;
            break;
        case adobeDPS.libraryService.folioStates.ENTITLED:
            this.enableBuyButton(true);
            this.showArchiveButton(false);
            
            label = "DOWNLOAD";
            break;
        case adobeDPS.libraryService.folioStates.DOWNLOADING:
            if (!this.folio.isViewable)
                this.enableBuyButton(false);
            
            if (!this.currentDownloadTransaction || (this.currentDownloadTransaction && this.currentDownloadTransaction.progress == 0)) {
                this.setDownloadPercent(0);
                state = "Waiting";
            }
                
            label = "VIEW";
            break;
        case adobeDPS.libraryService.folioStates.INSTALLED:
            label = "VIEW";
            this.showArchiveButton(true);
            break;
        case adobeDPS.libraryService.folioStates.PURCHASING:
        case adobeDPS.libraryService.folioStates.EXTRACTING:
        case adobeDPS.libraryService.folioStates.EXTRACTABLE:
            state = "Extracting";
            label = "VIEW";
            break;
    }
    
    this.$state.html(state);
    this.$buyButton.html(label);
        
}

// Looks for the current state changing transaction and begins tracking it if necessary.
FolioView.prototype.trackTransaction = function() {
    if (this.isTrackingTransaction)
        return;
        
    var transaction;
    for (var i = 0; i < this.folio.currentTransactions.length; i++) {
        transaction = this.folio.currentTransactions[i];
        if (transaction.isFolioStateChangingTransaction()) {
            // found one, so break and attach to this one
            break;
        } else {
            // null out transaction since we didn't find a traceable one
            transaction = null;
        }
    }

    if (!transaction)
        return;
    
    // Make sure to only track the transactions below.
    var transactionType = transaction.jsonClassName;
    if (transactionType != "DownloadTransaction" &&
        transactionType != "UpdateTransaction" &&
        transactionType != "PurchaseTransaction" &&
        transactionType != "ArchiveTransaction" &&
        transactionType != "ViewTransaction") {
            return;
    }

    // Check if the transaction is active yet
    if (transaction.state == adobeDPS.transactionManager.transactionStates.INITALIZED) {
        // This transaction is not yet started, but most likely soon will
        // so setup a callback for when the transaction starts
        transaction.stateChangedSignal.addOnce(this.trackTransaction, this);
        return;
    }
    
    this.isTrackingTransaction = true;
    
    this.currentDownloadTransaction = null;
    if (transactionType == "DownloadTransaction" || transactionType == "UpdateTransaction") {
        transaction.stateChangedSignal.add(this.download_stateChangedSignalHandler, this);
        transaction.progressSignal.add(this.download_progressSignalHandler, this);
        transaction.completedSignal.add(this.download_completedSignalHandler, this);
        this.currentDownloadTransaction = transaction;
        
        // This will occur if a user toggles to this view and more than one download is already occurring.
        // download_stateChangedSignalHandler should be triggered but it is not.
        if (transaction.state == adobeDPS.transactionManager.transactionStates.PAUSED)
            this.$state.html("Paused");
    } else {
        // Add a callback for the transaction.
        transaction.completedSignal.addOnce(function() {
            this.isTrackingTransaction = false;
        }, this)
    }
}

// Handler for when a user clicks the archive button.
FolioView.prototype.archiveButton_clickHandler = function() {
    if (this.folio.isArchivable)
        this.folio.archive();
}

// Handler for when a user clicks the buy button.
FolioView.prototype.buyButton_clickHandler = function() {
    var state = this.folio.state;
    if (state == adobeDPS.libraryService.folioStates.PURCHASABLE) {
        this.purchase();
    } else if (state == adobeDPS.libraryService.folioStates.INSTALLED || this.folio.isViewable) {
        this.folio.view();
    } else if (state == adobeDPS.libraryService.folioStates.ENTITLED) {
        if (this.isBuyButtonEnabled)
            this.folio.download();
    }
}

// Changes the opacity of the buyButton to give an enabled or disabled state.
FolioView.prototype.enableBuyButton = function(value) {
    this.$buyButton.css("opacity", value ? 1 : .6);
    
    this.isBuyButtonEnabled = value;
}

// Purchases the folio.
FolioView.prototype.purchase = function() {
    var transaction = this.folio.purchase();
    transaction.completedSignal.addOnce(function(transaction) {
        if (transaction.state == adobeDPS.transactionManager.transactionStates.FINISHED) {
            this.isTrackingTransaction = false;
            this.folio.download();
        } else if (transaction.state == adobeDPS.transactionManager.transactionStates.FAILED) {
            alert("Sorry, unable to purchase");
        }
        
        this.updateView();
    }, this);
}
    
// Downloads are automatically paused if another one is initiated so watch for changes with this callback.
FolioView.prototype.download_stateChangedSignalHandler = function(transaction) {
    if (transaction.state == adobeDPS.transactionManager.transactionStates.FAILED) {
        this.download_completedSignalHandler(transaction);
        this.updateView();
        this.enableBuyButton(true);
    } else if (transaction.state == adobeDPS.transactionManager.transactionStates.PAUSED) {
        this.$state.html("Paused");
    } else {
        this.$state.html("");
    }
}

// Updates the progress bar for downloads and updates.
FolioView.prototype.download_progressSignalHandler = function(transaction) {
    this.setDownloadPercent(transaction.progress);
}

// Handler for when a download or update completes.
FolioView.prototype.download_completedSignalHandler = function(transaction) {
    transaction.stateChangedSignal.remove(this.download_stateChangedSignalHandler, this);
    transaction.progressSignal.remove(this.download_progressSignalHandler, this);
    transaction.completedSignal.remove(this.download_completedSignalHandler, this);
        
    this.isTrackingTransaction = false;
}

// Sets the download progress bar.
FolioView.prototype.setDownloadPercent = function(value){
    value *= .01;
    this.$downloadAmount.html(Math.round(value * (this.folio.downloadSize / 1000000)) + " MB of " + Math.round(this.folio.downloadSize / 1000000) + " MB");
}

FolioView.prototype.showArchiveButton = function(value) {
    this.$archiveButton.css("display", value ? "block" : "none");
    if(value) this.$downloadAmount.html("");
}


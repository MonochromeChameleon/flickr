(function (root) {
    'use strict';

    var documentElements = {};
    var pageCount = 100;

    // Define our default configuration
    var baseUrl = 'http://www.flickr.com/services/rest/';
    var defaultMethod = 'flickr.photos.getRecent';
    var searchMethod = 'flickr.photos.search';

    var urlParameters = {
        method: 'flickr.photos.search',
        format: 'json',
        api_key: 'dcf4f025c1672c89dda032f0d54feee5',
        per_page: 10,
        page: 1,
        jsoncallback: 'flickr.handleFlickrResponse'
    };

    /*** Private functions ***/

    function constructNavigation(elements) {

        // Create a navigation div with previous / next links and a page number indicator.
        elements.navigation = document.createElement('div');
        elements.navigation.setAttribute('class', 'navigation');

        elements.previous = document.createElement('span');
        // The previous link should be disabled on first load.
        elements.previous.setAttribute('class', 'previous disabled');

        elements.current = document.createElement('span');
        elements.current.setAttribute('class', 'current');

        elements.pageNumber = document.createTextNode(urlParameters.page);
        elements.current.appendChild(elements.pageNumber);

        elements.next = document.createElement('span');
        // We can safely assume that the next link does not need to be disabled on first load.
        elements.next.setAttribute('class', 'next');

        // Append our child elements to the navigation div
        elements.navigation.appendChild(elements.previous);
        elements.navigation.appendChild(elements.current);
        elements.navigation.appendChild(elements.next);

        // Bind the navigation links to appropriate actions
        elements.previous.addEventListener('click', flickr.navigation.goToPreviousPage, false);
        elements.next.addEventListener('click', flickr.navigation.goToNextPage, false);
    }

    function constructSearch(elements) {

        // Construct a search div to contain the search form.
        elements.search = document.createElement('div');
        elements.search.setAttribute('class', 'search');

        // The search form need only contain an input and label.
        elements.searchField = document.createElement('input');
        elements.searchField.setAttribute('name', 'flickrSearch');
        elements.searchField.setAttribute('id', 'flickrSearch');
        elements.searchField.setAttribute('type', 'text');

        elements.searchLabel = document.createElement('label');
        elements.searchLabel.setAttribute('for', 'flickrSearch');

        // Append the label and input to our search div.
        elements.search.appendChild(elements.searchLabel);
        elements.search.appendChild(elements.searchField);

        // Bind the search field to keyup actions
        elements.searchField.addEventListener('keyup', function (event) {
            // Only search on a keyup event for the Enter key, provided the value has changed
            if (event.which === 13 && elements.searchField.value !== urlParameters.text) {
                flickr.search.performSearch(elements.searchField.value);
            }
        }, false);
    }

    function sendFlickrRequest() {

        // Add a 'loading' class to the content pane.
        documentElements.content.setAttribute('class', 'flickrResults loading');

        // If we have an incomplete request, we should delete the script element
        if (documentElements.script) {
            document.head.removeChild(documentElements.script);
        }

        // Put in our JSONP request
        documentElements.script = document.createElement('script');
        documentElements.script.src = flickr.urls.constructRequestUrl(urlParameters);
        document.head.appendChild(documentElements.script);
    }

    /*** Main public function ***/

    var flickr = function (options) {

        var elementId;

        if (typeof options === 'string') {
            // Basic exposed API = specify the element ID to be replaced with the Flickr plugin view
            elementId = options;
        } else if (options) {
            // Configurable API = individual options can be configured, or remain as the default

            elementId = options.elementId;

            // Copy any query string parameters from the calling options.
            for (var key in urlParameters) {
                if (options.hasOwnProperty(key)) {
                    urlParameters[key] = options[key];
                }
            }
        }

        if (!elementId) {
            // Bail out if no element is defined.
            console.log('No element defined for flickr display');
            return;
        }

        // Find our configured target element
        var flickrElement = document.getElementById(elementId);

        if (!flickrElement) {
            // If the target element is not on the page, we create it and append to the body.
            var flickrElement = document.createElement('div');
            flickrElement.setAttribute('id', elementId);
            document.body.appendChild(flickrElement);
        }

        // Initialize our document elements
        flickr.buildModule(flickrElement, documentElements);

        // Send our initial request so that we have some images loaded.
        sendFlickrRequest();
    };

    /*** Exposed API functions ***/

    // Expose the build method so that the default components can be overridden. The documentElements object should
    // be passed as a reference so that we can still access constructed components within other callbacks.
    flickr.buildModule = function (flickrElement, elements) {

        constructNavigation(elements);
        constructSearch(elements);

        // Construct a div in which to display our results.
        elements.content = document.createElement('div');
        elements.content.setAttribute('class', 'flickrResults');

        // Append the navigation, search and results divs.
        flickrElement.appendChild(elements.navigation);
        flickrElement.appendChild(elements.search);
        flickrElement.appendChild(elements.content);
    };

    // Expose URL functions so that they can be modified in-page should the API change.

    flickr.urls = {
        // URLs as described at http://www.flickr.com/services/api/misc.urls.html
        constructRequestUrl: function (parameters) {

            var requestURL = baseUrl + '?';

            // Set the appropriate API method depending on whether we have an active search or not.
            if (parameters.text) {
                parameters.method = searchMethod;
            } else {
                parameters.method = defaultMethod;
            }

            // Append the query string parameters to the base URL
            for (var key in parameters) {
                requestURL += (encodeURIComponent(key) + '=' + encodeURIComponent(parameters[key]) + '&');
            }

            return requestURL;
        },
        constructImageUrl: function (photo) {
            return 'http://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_t.jpg';
        },
        constructLinkUrl: function (photo) {
            return 'http://www.flickr.com/photos/' + photo.owner + '/' + photo.id;
        }
    };

    // Expose navigation and search functions so that we can bind to them explicitly in the page if required.

    flickr.navigation = {
        goToPreviousPage: function () {
            flickr.navigation.goToPage(urlParameters.page - 1);
        },
        goToNextPage: function () {
            flickr.navigation.goToPage(urlParameters.page + 1);
        },
        goToPage: function (pageNumber) {

            // Only take action if we are going to a valid page number
            if (pageNumber > 0 && pageNumber <= pageCount) {
                urlParameters.page = pageNumber;
                sendFlickrRequest();
            }
        }
    };

    flickr.search = {
        performSearch: function (query) {
            // Update the query string search option
            urlParameters.text = query;

            // If the search field is empty, we should delete that from our query string (and hence the urlParameters object)
            if (!urlParameters.text) {
                delete urlParameters.text;
            }

            if (documentElements.searchField.value !== query) {
                documentElements.searchField.value = query;
            }

            // Reset the page number as this is a new search
            urlParameters.page = 1;

            // Trigger a new request to match the new search term.
            sendFlickrRequest();
        }
    };

    flickr.display = {
        setCurrentPageNumber: function (currentPage, numberOfPages) {

            // If there is a current page indicator, we should replace it here.
            if (documentElements.current) {
                var newPageNumber = document.createTextNode(currentPage);

                // Replace the existing page number with the updated node.
                documentElements.current.replaceChild(newPageNumber, documentElements.pageNumber);
                documentElements.pageNumber = newPageNumber;
            }

            if (documentElements.previous) {
                // Disable the previous button if we are on the first page
                var previousLinkClass = currentPage === 1 ? 'previous disabled' : 'previous';
                documentElements.previous.setAttribute('class', previousLinkClass);
            }

            if (documentElements.next) {
                // Disable the next button if we are on the last page
                var nextLinkClass = currentPage === numberOfPages ? 'next disabled' : 'next';
                documentElements.next.setAttribute('class', nextLinkClass);
            }
        },
        // Allow explicit overriding of the individual result handling function for different display requirements.
        displayPhoto: function (photo, parentElement) {

            var imageUrl = flickr.urls.constructImageUrl(photo);
            var linkUrl = flickr.urls.constructLinkUrl(photo);

            // Build a link to the original image.
            var linkElement = document.createElement('a');
            linkElement.href = linkUrl;

            // Construct and append an image element in the link.
            var imageElement = document.createElement('img');
            imageElement.src = imageUrl;

            linkElement.appendChild(imageElement);

            // Place our link inside a wrapper div and append that to our content pane.
            var imageDiv = document.createElement('div');
            imageDiv.setAttribute('class', 'flickrImage');
            imageDiv.appendChild(linkElement);

            parentElement.appendChild(imageDiv);
        }
    };

    // Response handler needs to be public in order to be accessed as a JSONP callback.
    flickr.handleFlickrResponse = function (data) {

        // Update the page count and disabled state for our navigation links.
        flickr.display.setCurrentPageNumber(urlParameters.page, data.photos.pages);

        // When we have our JSONP response back, we can clear the previous images and process the details of the new ones.
        while (documentElements.content.firstChild) {
            documentElements.content.removeChild(documentElements.content.firstChild);
        }

        // Remove the 'loading' class from the results pane.
        documentElements.content.setAttribute('class', 'flickrResults');

        // Handle each image in the response data
        for (var index in data.photos.photo) {
            flickr.display.displayPhoto(data.photos.photo[index], documentElements.content);
        }
    };

    // Export our main function as a global
    root.flickr = flickr;
}(this));
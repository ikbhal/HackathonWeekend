(function($, moment, Cufon){
  var EventDetail, objectSize, buildQueryUrl,
    processEventData, filterUnusableEvents, generateItemHtml; 

  EventDetail = function (params) {
    this.params = params;

    /**
     * Returns the location in the order of City, State, and Country
     */
    this.location = function () {
      try {
        var location = [];
        location.push(this.params.city);
        if(typeof(this.params.state) == 'string'){
          if(this.params.state != ""){
            location.push(this.params.state);
          }
        }
        if(typeof(this.params.country) == 'string'){
          if(this.params.country != ""){
            location.push(this.params.country);
          }
        }
        return location.join(", ");        
      } catch (e) {
        return "";
      }
    };

    /**
     * Test for Website
     */
    this.hasWebsite = function(){
      try {
        var website = this.params.website;
        return typeof(website) == 'string' && website != "";
      } catch (e) {
        return false;
      }
    };

    /**
     * Returns the website with "http://" prepended
     */
    this.website = function () {
      try {
        var website = this.params.website;
        var httpRegexp = new RegExp(/^http:\/\//i);

        if(! httpRegexp.test(website)){
          website = "http://" + website;
        }

        return website;
      } catch (e) {
        return "";
      }
    };

    /**
     * Returns the startDate and endDate as a humanized string
     */
    this.eventPeriod = function () {
      try {
        var eventPeriod = [];
        var startDate = moment.utc(this.params.start_date);
        var endDate = moment.utc(this.params.start_date).add('days', 2);
        var divider = "&#150;";
        var startDateFormat = "MMMM D";
        var endDateFormat = "D";

        if(startDate.month() != endDate.month()){
          endDateFormat = "MMMM D";
        }

        // Build Period String
        eventPeriod.push(startDate.format(startDateFormat));
        eventPeriod.push(divider);
        eventPeriod.push(endDate.format(endDateFormat));

        return eventPeriod.join(" ");
      } catch (e) {
        return "";
      }
    };

    return this;
  };

  /**
   * Given an object, return the number of keys
   */
  objectSize = function (obj) {
    if (obj.length) { return obj.length; }

    var size = 0, key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) { size += 1; }
    }
    return size;
  };

  /**
   * Build a URL with the query parameters added as
   * URL parameters. This URL will represent the API
   * endpoint for getting events
   *
   * @baseUrl - A string representing the base API URL, including the protocol
   * @query - An object holding key-value pairs representing the API query
   */
  buildQueryUrl = function (baseUrl, query) {
    var prop, finalUrl, queryTerms = [];

    // Chop off the trailing slash if it exists
    if (baseUrl[baseUrl.length - 1] === '/') {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (query && objectSize(query) > 0) {
      for (prop in query) {
        if (query.hasOwnProperty(prop)) {
          queryTerms.push(prop + "=" + query[prop]);
        }
      }

      finalUrl = baseUrl + "?" + queryTerms.join("&");
    } else {
      finalUrl = baseUrl;
    }

    return finalUrl;
  };


  /**
   * Given a list of events, only return the ones we can
   * use on the map. In this case, usable events are in
   * a Good or Working state, and have location data attached
   * on them
   */
  filterUnusableEvents = function (events, filterFn) {
    if (typeof filterFn === 'undefined') {
      filterFn = function (event) {
        return event.event_status && (
          event.event_status === 'G' ||
          event.event_status === 'W'
        ) && event.location
          && event.location.lat
          && event.location.lng;
      };
    }

    return events.filter(filterFn);
  };

  /**
   * Generates the Item HTML
   *
   */
  generateItemHtml = function (item) {
    var html = ['<li>'];
    html.push('<h4 class="parisine">'+item.location()+'</h4>');
    html.push('<span class="parisine"><p>'+item.eventPeriod()+'</p></span>');
    if(item.hasWebsite()){
      html.push('<a class="registerBtn" target="_blank" href="'+item.website()+'"></a>');
    }
    html.push('<a href="http://startupweekend.org/events" class="viewAll"></a>');
    html.push('</li>');
    return html.join('\n');
  };

  /**
   * A function to receive data from the API server, process
   * it, and kick off other processing activity
   *
   * @data - An array of JSON objects representing events
   */
  processEventData = function (data, settings, domElement) { 
    var eventList, eventDetails;

    eventList = [];
    eventDetails = filterUnusableEvents(data, settings.filterFn);

    $.each(eventDetails, function(key, detail){
      var eventDetail = new EventDetail(detail);
      eventList.push(generateItemHtml(eventDetail));
    });

    // Attach HTML to DomElement
    $('<ul/>', {
      'class': 'items',
      html: eventList.join("")
    }).appendTo(domElement);

    // Invoke Scrollable and AutoScroll
    $(domElement)
      .scrollable({ items: ".items", circular:true, next:".next", prev: ".previous" })
      .autoscroll ({ autoplay: true, interval: 8000 }); 

    // Replace Text with special fonts
    Cufon.replace('p,.parisine,.parisine > p,ol > li,.desc', {fontFamily:'parisine'});
    Cufon.replace('h1,h2,h3,h4,h5,h6,.text,.rockwell,.tb_author,.tb_msg,.tb_tweet-info', {fontFamily:'rockwell'});
  };

  /**
   * This plugin creates a rotator from the event data
   * provided by the SWOOP API
   *
   * @opts - The settings for the plugin
   * @opts:url - URL of SWOOP
   * @opts:query - HTTP Query to include in AJAX Call
   * @opts:filterFn - A function to filter the event list
   */
  $.fn.swEventRotator = function (opts) {
    var domElement, defaults;

    defaults = {
      url: 'http://swoop.up.co/events',
      query: {
        since: moment().format("YYYY-MM-DD"),
        until: moment().add("M", 1).format("YYYY-MM-DD")
      },
      filterFn: function (event) {
        return event.event_status && (
          event.event_status === 'G' ||
          event.event_status === 'W'
        );
      }
    };

    settings = $.extend(defaults, opts);
    apiUrl = buildQueryUrl(settings.url, settings.query);
    domElement = this[0];

    $.ajax({
      dataType: 'jsonp',
      url: apiUrl,
      success: function(data){
        processEventData(data, settings, domElement);
      }
    });
  };

})(jQuery, moment, Cufon);

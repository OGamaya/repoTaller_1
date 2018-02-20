(function () {
    'use strict';

    var app = {
        isLoading: true,
        visibleCards: {},
        selectedTimetables: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container'),
        db:undefined
    };
    /*****************************************************************************
     *
     * Event listeners for UI elements
     *
     ****************************************************************************/

    document.getElementById('butRefresh').addEventListener('click', function () {
        // Refresh all of the metro stations
        app.updateSchedules();
    });

    document.getElementById('butAdd').addEventListener('click', function () {
        // Open/show the add new station dialog
        app.toggleAddDialog(true);
    });

    document.getElementById('butAddCity').addEventListener('click', function () {


        var select = document.getElementById('selectTimetableToAdd');
        var selected = select.options[select.selectedIndex];
        var key = selected.value;
        var label = selected.textContent;
        if (!app.selectedTimetables) {
            app.selectedTimetables = [];
        }
        app.getSchedule(key, label);
        app.selectedTimetables.push({key: key, label: label});
        app.saveSelectedTimetables();
        app.toggleAddDialog(false);
    });

    document.getElementById('butAddCancel').addEventListener('click', function () {
        // Close the add new station dialog
        app.toggleAddDialog(false);
    });


    /*****************************************************************************
     *
     * Methods to update/refresh the UI
     *
     ****************************************************************************/

    // Toggles the visibility of the add new station dialog.
    app.toggleAddDialog = function (visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    // Updates a timestation card with the latest weather forecast. If the card
    // doesn't already exist, it's cloned from the template.

    app.updateTimetableCard = function (data) {
        var key = data.key;
        var dataLastUpdated = new Date(data.created);
        var schedules = data.schedules;
        var card = app.visibleCards[key];

        if (!card) {
            var label = data.label.split(', ');
            var title = label[0];
            var subtitle = label[1];
            card = app.cardTemplate.cloneNode(true);
            card.classList.remove('cardTemplate');
            card.querySelector('.label').textContent = title;
            card.querySelector('.subtitle').textContent = subtitle;
            card.removeAttribute('hidden');
            app.container.appendChild(card);
            app.visibleCards[key] = card;
        }
        var cardLastUpdatedElem = card.querySelector('.card-last-updated');
        var cardLastUpdated = cardLastUpdatedElem.textContent;
        if (cardLastUpdated) {
          cardLastUpdated = new Date(cardLastUpdated);
          // Bail if the card has more recent data then the data
          if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
            return;
          }
        }
        card.querySelector('.card-last-updated').textContent = data.created;

        var scheduleUIs = card.querySelectorAll('.schedule');
        for(var i = 0; i<4; i++) {
            var schedule = schedules[i];
            var scheduleUI = scheduleUIs[i];
            if(schedule && scheduleUI) {
                scheduleUI.querySelector('.message').textContent = schedule.message;
            }
        }

        if (app.isLoading) {
            window.cardLoadTime = performance.now();
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }
    };

    /*****************************************************************************
     *
     * Methods for dealing with the model
     *
     ****************************************************************************/


    app.getSchedule = function (key, label) {
        var url = 'https://api-ratp.pierre-grimaud.fr/v3/schedules/' + key;
        if ('caches' in window) {
         /*
          * Check if the service worker has already cached this city's weather
          * data. If the service worker has the data, then display the cached
          * data while the app fetches the latest data.
          */
         caches.match(url).then(function(response) {
           if (response) {
             response.json().then(function updateFromCache(json) {
               var results = json.query.results;
               results.key = key;
               results.label = label;
               results.created = json.query.created;
               app.updateTimetableCard(results);
             });
           }
         });
       }
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    var result = {};
                    result.key = key;
                    result.label = label;
                    result.created = response._metadata.date;
                    result.schedules = response.result.schedules;
                    app.updateTimetableCard(result);
                }
            } else {
                // Return the initial weather forecast since no data is available.
                app.updateTimetableCard(initialStationTimetable);
            }
        };
        request.open('GET', url);
        request.send();
    };

    // Iterate all of the cards and attempt to get the latest timetable data
    app.updateSchedules = function () {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function (key) {
            app.getSchedule(key);
        });
    };

    app.saveSelectedTimetables = function() {
      var selectedTimetables = JSON.stringify(app.selectedTimetables);
      localStorage.selectedTimetables = selectedTimetables;
      var save = app.db.transaction(["station"], "readwrite").objectStore("station");

      app.selectedTimetables.forEach(function(timetable){
        save.put(timetable)
      })

    };

    /*
     * Fake timetable data that is presented when the user first uses the app,
     * or when the user has not saved any stations. See startup code for more
     * discussion.
     */

    var initialStationTimetable = {

        key: 'metros/1/bastille/A',
        label: 'Bastille, Direction La Défense',
        created: '2017-07-18T17:08:42+02:00',
        schedules: [
            {
                message: '0 mn'
            },
            {
                message: '2 mn'
            },
            {
                message: '5 mn'
            }
        ]


    };


    /************************************************************************
     *
     * Code required to start the app
     *
     * NOTE: To simplify this codelab, we've used localStorage.
     *   localStorage is a synchronous API and has serious performance
     *   implications. It should not be used in production applications!
     *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
     *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
     ************************************************************************/
/**
    app.getSchedule('metros/1/bastille/A', 'Bastille, Direction La Défense');
    app.selectedTimetables = [
        {key: initialStationTimetable.key, label: initialStationTimetable.label}
    ];*/



    if (!window.indexedDB) {
      window.alert("Su navegador no soporta una versión estable de indexedDB. Tal y como las características no serán validas");
    } else {
      var request = indexedDB.open("taller-1");
      request.onerror = function(event) {
        alert("Why didn't you allow my web app to use IndexedDB?!");
      };
      request.onupgradeneeded = function(event) {
        app.db = event.target.result;
        // Se crea un almacén para contener la información de nuestros cliente
        // Se usará "ssn" como clave ya que es garantizado que es única
        var objectStore = app.db.createObjectStore("station", { keyPath: "key" });
        console.log('station Object ready')
      };
      request.onsuccess = function(event) {
        app.db = request.result;
        console.log('IndexedDB ready_event')
      };
    }


    app.selectedTimetables = localStorage.selectedTimetables;

      console.log(app.db)
      console.log(typeof app.db)
      console.log(typeof app.db != 'undefined')
    if (app.db) {
      console.log('reading')
      var read = app.db.transaction(["station"], "read").objectStore("station");
      app.selectedTimetables = read.getall();
    }
    /**console.log(app.db)
    console.log('#####')
      if (!app.db) {
        console.log('need db')
        app.instanceDb();
        console.log(app.db)
        console.log('#####')
      }


      var read = app.db.transaction(["station"], "read").objectStore("station");
      app.selectedTimetables = read.getall();
      alert('reading db');
      console.log(app.selectedTimetables)
      app.selectedTimetables = JSON.parse(app.selectedTimetables);
      console.log(app.selectedTimetables)
*/
    if (app.selectedTimetables) {
      app.selectedTimetables = JSON.parse(app.selectedTimetables);
      app.selectedTimetables.forEach(function(table) {
        app.getSchedule(table.key, table.label);
      });
    } else {
        /* The user is using the app for the first timegetForecast, or the user has not
         * saved any cities, so show the user some fake data. A real app in this
         * scenario could guess the user's location via IP lookup and then inject
         * that data into the page.
         */

        window.firstCallTime = performance.now();
        app.updateTimetableCard(initialStationTimetable);
        app.selectedTimetables = [
          {key: initialStationTimetable.key, label: initialStationTimetable.label}
        ];

        //app.saveSelectedTimetables();
      }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
             .register('./service-worker.js')
             .then(function(reg) {
               // updatefound is fired if service-worker.js changes.
               reg.onupdatefound = function() {
                 // The updatefound event implies that reg.installing is set; see
                 // https://w3c.github.io/ServiceWorker/#service-worker-registration-updatefound-event
                 var installingWorker = reg.installing;

                 installingWorker.onstatechange = function() {
                   switch (installingWorker.state) {
                     case 'installed':
                       if (navigator.serviceWorker.controller) {
                         // At this point, the old content will have been purged and the fresh content will
                         // have been added to the cache.
                         // It's the perfect time to display a "New content is available; please refresh."
                         // message in the page's interface.
                         console.log('New or updated content is available.');
                       } else {
                         // At this point, everything has been precached.
                         // It's the perfect time to display a "Content is cached for offline use." message.
                         console.log('Content is now available offline!');
                       }
                       break;

                     case 'redundant':
                       console.error('The installing service worker became redundant.');
                       break;
                   }
                 };
               };
             }).catch(function(e) {
               console.error('Error during service worker registration:', e);
             });
    }




})();

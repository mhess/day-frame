//= require bootstrap/modal
//= require util

angular.module('bootstrapModal', [])

  .provider('$modals', function(){
    var modals = {};
    var modalOuter;
    var modalContainer;
    var containerHTML = '<div class="modal fade"><div class="modal-dialog"></div></div>';

    // cfg objects = {open: function, ctrl: string }
    this.register = function(name, cfg) { modals[name] = cfg; };

    // The actual $modals service object
    var modalService = {};

    this.$get = ['$document', '$compile', '$controller', '$rootScope',
                 '$http', '$templateCache', '$window', '$q', '$injector',
      function($document, $compile, $controller, $rootScope, $http, $templateCache, $window, $q, $injector) {
        modalOuter = $(containerHTML).appendTo($document.find(this.appSelector));
        modalContainer = modalOuter.find('.modal-dialog');
        angular.forEach(modals,
          function(cfg, name) {

            // $close function added to scope that resolves the modal's promise
            cfg.close = function(val, err) {
              modalOuter.modal('hide');
              cfg.content.remove();
              cfg.scope.$destroy();
              if ( err ) cfg.deferred.reject(val);
              else cfg.deferred.resolve(val);};

            var getOpts = $window.location.host.match(/^localhost/) ? {} :{cache: $templateCache};
            // Attach modal activation function
            modalService[name] = function(arg) {
              cfg.deferred = $q.defer();

              // Fetch modal html              
              var pagePromise = $http.get(
                cfg.tmplUrl, getOpts)
                  .then(
                    function(resp){
                      // Create a new scope and instantiate new controller for each call
                      cfg.scope = $rootScope.$new();
                      cfg.content = $compile(resp.data)(cfg.scope);
                      },
                    function(){$window.alert('Loading modal template failed: '+cfg.tmplUrl);});

                // Perform modal initialization with "open" function
                var initPromise;
                if ( cfg.open ) 
                  initPromise = $injector.invoke(cfg.open, null, {arg: arg});

                // Combine modal html load and initialization promises;
                $q.all([initPromise, pagePromise])
                  .then(function(promArray){
                    $controller(cfg.ctrl, {$scope: cfg.scope, $close: cfg.close});
                    angular.extend(cfg.scope, promArray[0]);
                    modalContainer.append(cfg.content);
                    modalOuter.modal({backdrop:'static', keyboard: false});});

                return cfg.deferred.promise;};});
        return modalService;
    }];
  });
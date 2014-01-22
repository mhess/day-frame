//= require angular
//= require angular-cookies
//= require jquery.ui.draggable
//= require jquery.ui.droppable
//= require jquery.ui.resizable
//= require util
//= require task_services
//= require modal
//= require auth
//= require bootstrap/dropdown
//= require google_api

var oneDay = 1000*60*60*24;

var app = angular.module("app", 
  ['tasks', 'util', 'bootstrapModal', 'auth', 'ngCookies', 'google'])

  .controller('viewCtrl', 
    ['$scope', '$tasks', 'hoursArray', 'Time', '$modals', '$auth', '$rootScope', '$window',
      function($scope, $tasks, hoursArray, Time, $modals, $auth, $rootScope, $window) {
        $scope.modals = $modals;
        $scope.auth = $auth;
        $scope.tasks = $tasks;
        $scope.signInFields = {email: null, passwd: null};
        $scope.dayText = "That's";
        
        $scope.logIn = function() {
          var fields = $scope.signInFields;
          $scope.$broadcast('autofill:update');
          $auth.logIn(fields)
            .then(
             function(){$auth.logInTransition();},
             function(respObj) {
               if ( 'errors' in respObj ) {
                 console.log(respObj.errors);
                 return;}
               delete $scope.signInFields;});};

        function initWakeSleep(){
          var u = $auth.user;
          $rootScope.wake = u ? new Time(u.wake) : new Time(420);
          $rootScope.sleep = u ? new Time(u.sleep) : new Time(1380);}

        // Day watcher //

        var timeline = $tasks.timeline;                             
        $scope.$watch('tasks.date',
          function(newDay, oldDay) {
           // Update dayText
            var delta = Math.round((newDay.getTime()-(new Date()).getTime())/oneDay);
            var dayText = "That's";
            var count, prep;
            if ( delta ) {
              count = Math.abs(delta);
              prep = delta < 0 ? "before" : "after";
              plural = count > 1 ? "s " : ' ';
              dayText = count+" "+" day"+plural+prep;
            }
            $scope.dayText = dayText;

            // Set wake/sleep based on assigned tasks for this day.
            initWakeSleep();
            if ( !timeline.length ) return;
            var first = timeline[0].start;
            var last = timeline[timeline.length-1].start;
            if ( first.lt($rootScope.wake) )
              $rootScope.wake = first.floor();
            if (last.gt($rootScope.sleep) )
              $rootScope.sleep = last.ceil();
          }, true);

        // Logic to update now marker //

        var now = new Time(new Date);
        var nowMarker = $('#now-marker');
        var intvlId;
        function updateNowMarker(){
          now.fromDate(new Date());
          if ( now.gt($rootScope.sleep) || now.lt($rootScope.wake) ) 
            nowMarker.hide();
          else nowMarker.show().css('top', now.toOffset($rootScope.wake));}

        initWakeSleep();
        updateNowMarker()
        setInterval(updateNowMarker, 60000);

        // Wake/sleep watcher //

        $scope.$watch('wake+""+sleep', function(v) {
          if ( !v ) return;
          $scope.hours = hoursArray($rootScope.wake, $rootScope.sleep);
          updateNowMarker();
        });
                             
        // Task maniplulation functions //
        $scope.deleteTask = function(task) {
          if ( $window.confirm("Are you sure you want to delete this task?") )
            task.delete();};

        $scope.unassign = function(task) {task.update({start: null});};

  }])

  .directive('task', ['$compile',
    function($compile) {
      return {
        restrict: 'E',
        templateUrl: 'angular/task.html',
        replace: true,
        controller: ['$scope', function($scope) {
          $scope.duration = null;
          $scope.$watch('task.duration',
            function(d) {$scope.duration = d.toString();},
            true);}],
        link: function(scope, el) {
          var timeDroppable = $('.time-droppable');
          var task = scope.task;

          // Scoped variables that determine the
          // element's height and displayed range.
          scope.drag = false;
          scope.resize = false;
          
          scope.range = function() {
            if ( !task.start ) return '';
            var begin = task.start,
                end = task.start.add(task.duration);
            return begin+' - '+end;
          };                                   

          // Set task element style according to model object
          // properties (start, duration)
          scope.getStyle = function() {
            var styles = {};
            if (scope.drag || task.start !== null) {
              styles.height = task.duration.pixels();
              if ( task.start!==null )
                angular.extend(
                  styles,
                  {top: task.start.toOffset(scope.wake),
                   left: 0, height: task.duration.pixels()});
              if ( styles.height < ( 8 + 14 ) ) {
                styles.fontSize = styles.height - 8;
              }
            }
            return styles;
          };
          
          scope.getClass = function (){
            var val = 'pri-'+task.priority,
              height = el.height();
            if ( height < (6+28) ) val += ' single-line';
            if ( task.start===null ) val += ' clearfix';
            if ( scope.drag ) val += ' drag';
            return val;
          };
          
          // Set CSS/draggable based on whether assigned or not
          if (task.start!==null) {
            el.draggable({containment:'.time-droppable'});
            el.resizable({handles: 's', grid: [0, 5],
                          containment:'parent',
                          resize: function(e,ui){
                            scope.$apply(
                              function(){task.duration.fromPx(closest5(ui.size.height));}
                            );},
                          start: function(){scope.resize=true;},
                          stop: function(){
                            scope.$apply(
                              function() {task.update(); scope.resize=false;});
                          }});
          } else {
            el.draggable(
              {containment: "document",
               helper: function() {
                 var clone = $(this).clone().removeAttr('ng-repeat');
                 scope.$apply(
                   function(){
                     scope.drag = true;
                     $compile(clone)(scope);}
                 );
                 return clone;}
              });
          }
          
          // Drag config for both types of tasks.
          el.draggable(
            {cancel: '.control',
             snap: ".snap",
             snapMode: "inner",
             snapTolerance: 25,
             revert: 'invalid',
             start: function(e, ui){
               if ( task.start===null ) el.hide();
               scope.$apply('drag=true'); },
             stop: function(e, ui){
               if ( task.start===null ) el.show();
               scope.$apply('drag=false'); },
             drag: function(e, ui) {
               var dLeft = ui.offset.left,
                   tLeft = timeDroppable.offset().left;
               if ( Math.abs(dLeft-tLeft) <= 25 ) {
                 var offset = ui.helper.offset().top - timeDroppable.offset().top;
                 offset = closest15(offset);
                 scope.$apply(
                   function(){
                     if ( task.start ) task.start.fromOffset(offset, scope.wake);
                     else task.start = new Time(offset, scope.wake);});
               } else {
                 scope.$apply(function(){task.start=null;});
               }
             }
            });
        }};}])

  .directive('timeDroppable', function() {
    return {
      restrict: 'C',
      link: function(scope, el) {                        
        el.droppable(
          {drop: function (event, ui) {
            var taskScope = ui.draggable.scope();
            setTimeout(function(){taskScope.$apply('task.update()');});}});}};})

  .directive('hourSelect',
    ['$tasks', function($tasks) {
       var timeline = $tasks.timeline;
       return {
         scope: {time: '=hourSelect', which: '@hourSelect'},
         templateUrl: 'angular/hour_select.html',
         controller: ['$scope', function($scope) {
           $scope.up = function() {
             var firstTask = timeline[0];
             if ( $scope.which==='wake' && firstTask )
               if ( $scope.time.diff(firstTask.start).min > -60 ) return;
             $scope.time.addIn(60);};
           $scope.down = function(){
             var lastTask = timeline[timeline.length-1];
             if ( $scope.which==='sleep' && lastTask ) {                               
               var endTime = lastTask.start.add(lastTask.duration);
               if ( $scope.time.diff(endTime).min < 60 ) return;}
             $scope.time.addIn(-60);};}]};}])

  .controller('taskModalCtrl',
    ['$scope', '$close', 'Time', 'Minutes', '$tasks',
    function($scope, $close, Time, Minutes, $tasks) {
      $scope.tmpl = {};
      $scope.dur = {hr: null, min: null};
      $scope.invalid = false;
      $scope.errors = {dur: null, title: null, 
        start: null, description:null};

      $scope.$watch('tmpl.title', function() {
        var error = null;
        if ( !$scope.tmpl.title )
          error = "Title cannot be blank.";
        $scope.errors.title = error;});

      $scope.$watch('dur', function(dur) {
        if ( dur.min > 59 ) {
          dur.hr += Math.floor(dur.min / 60);
          dur.min = dur.min % 60;}
        if ( dur.hr > 23 ) dur.hr = 23;                                         
        var error = null;
        if ( (!dur.min && !dur.hr) || (!dur.hr && dur.min < 10) )
          error = "Duration must at least 10 minutes.";
        else if ( dur.min % 5 )
          error = "Duration must be a multiple of 5 mintues.";
        $scope.errors.dur = error;
      }, true);

      $scope.$watch('errors', function(errs){
        for (var k in errs) {
          if ( errs[k] ) {
            $scope.invalid = true;
            return;}}
        $scope.invalid = false;
      }, true);

      $scope.close = $close;

      $scope.save = function() {
        var tmpl = $scope.tmpl;
        tmpl.duration = new Minutes($scope.dur.hr, closest5($scope.dur.min));
        tmpl.start = tmpl.start ? new Time(tmpl.start) : null;
        tmpl.priority = parseInt(tmpl.priority);
        if ( 'id' in tmpl ) // Editing existing task
          $tasks.get(tmpl.id).update($scope.tmpl);
        else  // Creat new task
          $tasks.create(tmpl);
        $close();};
  }])

  .controller('signUpModalCtrl',
    ['$scope', '$auth', '$close', 
      function($scope, $auth, $close){
        $scope.invalid = true;
        $scope.submitError = false;
        var u = $scope.user = {
          name:null, email:null, passwd:null,
          passwordCnf:null};

        $scope.errors = {name:null, email:null, 
          passwd:null, passwdCnf:null};

        var errs = $scope.errors;

        $scope.$watchCollection('user', function(u){
          if ( !u.name && $scope.form.name.$dirty )
            errs.name = "Name is required!";
          else errs.name = null;

          if ( !u.email && $scope.form.email.$dirty )
            errs.email = "Email is invalid!";
          else errs.email = null;

          if ( $scope.form.passwd.$dirty ) {
            if ( u.passwd.length < 8 ) {
              errs.passwd = "Password must be at least 8 characters!";
            } else errs.passwd = null;
          }

          if ( $scope.form.passwdCnf.$dirty ) {
            if ( u.passwd !== u.passwdCnf )
              errs.passwdCnf = "Passwords must match!";
            else errs.passwdCnf = null;
          }

          for ( var k in errs ){
            if ( errs[k] || !u[k] ){$scope.invalid = true; return;}}
          $scope.invalid = false;});

        $scope.close = $close;
        $scope.signUp = function(){
          $auth.signUp(u).then(
            function(){
              $close();
              $auth.logInTransition();}, 
            function(errors){
              $scope.submitError = true;
              angular.forEach(errors, function(v,k) {
                errs[k] = "This "+k+" "+v+".";});});};
  }])

  .controller('logInModalCtrl', 
    ['$scope', '$auth', '$close', 
      function($scope, $auth, $close){
        $scope.invalid = true;
        $scope.submitError = false;
        var fields = $scope.fields = {email:null, passwd:null};

        var errs = $scope.errors = {email:null, passwd:null};

        $scope.$watchCollection('fields', function(f){
          if ( !fields.email && $scope.form.email.$dirty )
            errs.email = "Email is invalid!";
          else errs.email = null;

          if ( $scope.form.passwd.$dirty ) {
            if ( fields.passwd.length < 8 ) {
              errs.passwd = "Password must be at least 8 characters!";
            } else errs.passwd = null;
          }

          for ( var k in errs ){
            if ( errs[k] || !fields[k] ){$scope.invalid = true; return;}}
          $scope.invalid = false;});

        $scope.close = $close;

        $scope.logIn = function(){
          $auth.logOut()
            .then(
              function(){return $auth.logIn(fields);})
            .then(
              function(){$close();}, 
              function(errors){
                $scope.submitError = true;
                angular.forEach(errors, function(v,k){
                  errs[k] = "This "+k+" "+v+".";});});};
      }])

  .controller('accountModalCtrl',
    ['$scope', '$auth', '$close', '$tasks', 'gCalStore',
      function($scope, $auth, $close, $tasks, gCalStore){
        $scope.invalid = false;
        $scope.submitError = false;

        var u = $scope.user = angular.copy($auth.user);
        $scope.$broadcast('userReady');
        u.wake = new Time($auth.user.wake);
        u.sleep = new Time($auth.user.sleep);

        var errs = $scope.errors = {name:null, email:null, 
          passwd:null, passwdCnf:null};

        $scope.$watchCollection('user', function(u){
          if ( !u.name )
            errs.name = "Name is required!";
          else errs.name = null;

          if ( !u.wake ) errs.wake = "Wake time is invalid!";
          else errs.wake = null;

          if ( !u.sleep ) errs.sleep = "Sleep time is invalid!";
          else errs.sleep = null;          

          for ( var k in errs ){
            if ( errs[k] ){$scope.invalid = true; return;}}
          $scope.invalid = false;
        });

        $scope.close = $close;
        $scope.update = function(){
          $auth.update(u).then(
            function(){
              var change = false;
              angular.forEach(u.gcals, function(c){
                if ( !$tasks.stores[c.id] ) {
                  $tasks.addStore(new gCalStore(c.id));
                  change = true;}});
              if ( change ) $tasks.changeDay();
              $close();}, 
            function(errors){
              $scope.submitError = true;
              angular.forEach(errors, function(v,k) {
                errs[k] = "This "+k+" "+v+".";});});};
      }])

  .controller('forgotModalCtrl',
    ['$scope', '$auth', '$close', 
      function($scope, $auth, $close){
        $scope.invalid = false;
        $scope.submitError = false;
        $scope.email = null;

        var errs = $scope.errors = {email: null};

        $scope.$watch('email', function(e){
          if ( !e && $scope.form.email.$dirty )
            errs.email = "Email is invalid!";
          else errs.email = null;

          for ( var k in errs ){
            if ( errs[k] ){$scope.invalid = true; return;}}
          $scope.invalid = false;
        });

        $scope.close = $close;
        $scope.submit = function(){
          $auth.forgot($scope.email).then(
            function(){ $close();}, 
            function(errors){
              $scope.submitError = true;
              angular.forEach(errors, function(v,k) {
                errs[k] = "This "+k+" "+v+".";});});};
      }])

  .directive('timeInput', 
    function(){
      return {
        restrict: 'A',
        require: 'ngModel',
        link: function(s, e, a, ctrl){
          ctrl.$parsers.push(
            function(i){
              var mv = ctrl.$modelValue;
              return i ? ( mv ? mv.fromForm(i) : new Time(i) ) : null;});
          ctrl.$formatters.push(
            function(i){return i ? i.toForm() : null;});}};
  })

  .directive("autofill", function () {
    return {
      require: "ngModel",
      link: function ($scope, el, a, ctrl) {
          $scope.$on("autofill:update", 
            function(){ctrl.$setViewValue(el.val());});}};
  })

  .directive('widgetArea',
    ['$auth', '$window',
      function($auth, $window){
        return {restrict: 'C',
          link: function($scope, $el){
            var myWindow = angular.element($window);
            var fixedClass = 'fixed-top';
            if ( !$scope.welcome ){
              $el.addClass('fixed-top');
              myWindow.off('scroll.fixWidgetArea');
            // Affix logic
            } else {
              var fixed = false;
              var top = $el.offset().top;
              myWindow.on('scroll.fixWidgetArea', function(){
                if ( fixed ) {
                  if ( myWindow.scrollTop() < top ){
                    fixed = false;
                    $el.removeClass(fixedClass);}
                  } else if ( myWindow.scrollTop() >= top ){
                    fixed = true;
                    $el.addClass(fixedClass);}});}
            $scope.$on('fixWidgetArea', function(){
              $el.addClass(fixedClass);
              myWindow.off('scroll.fixWidgetArea');});}};}])

  .controller('googleCalSelectCtrl', 
    ['$scope', '$gclient',
    function($scope, $gclient){
      var cals;
      $scope.state = 1;

      $scope.$on('userReady', function(){
        cals = $scope.cals = angular.copy($scope.user.gcals);
        if ( cals.empty ) $scope.state = 0;
        else $scope.init();});

      $scope.init = function(){
        if ( $scope.user.gcals.empty ) {
          delete cals.empty;
          delete $scope.user.gcals.empty;}
        $scope.state = 1;
        $gclient.load('calendar', 'v3')
          .then(
            function(){return $gclient.calendar.calendarList.list();},
            function(){$scope.state = 0;})
          .then(function(resp){
            angular.forEach(resp.items, function(c){
              if ( !cals[c.id] ) cals[c.id] = c;});
            $scope.state = 2;});};

      $scope.toggle = function(c){
        if ( c.sel ) delete $scope.user.gcals[c.id];
        else $scope.user.gcals[c.id] = c;
        c.sel = !c.sel;}
  }])

  .constant('modalCfgs', {
    task:{
      tmplUrl: 'angular/task_modal.html',
      ctrl: 'taskModalCtrl',
      open: ['arg', function(arg){
        var scopeExt = {};
        scopeExt.header = arg ? "Edit Task": "Create Task";
        var taskTmpl = {title: "New Task", start: null,
          priority: 3, description: null};
        scopeExt.dur =  arg ? arg.duration.withHrs() : {hr: 0, min: 30};
        var tmpl = arg && angular.copy(arg) || taskTmpl;
        tmpl.start = tmpl.start ? tmpl.start.toForm() : null;
        scopeExt.tmpl = tmpl;
        return scopeExt;}]},

    signUp:{
      tmplUrl: 'angular/signup_modal.html',
      ctrl: 'signUpModalCtrl'},

    logIn:{
      tmplUrl: 'angular/login_modal.html',
      ctrl: 'logInModalCtrl'},

    account:{
      tmplUrl: 'angular/account_modal.html',
      ctrl: 'accountModalCtrl'},

    forgot:{
      tmplUrl: 'angular/forgot_modal.html',
      ctrl: 'forgotModalCtrl'}
  })

  .config(['$modalsProvider', 'modalCfgs', '$httpProvider',
    function($modalsProvider, modalCfgs, $httpProvider) {

      // Configure modals
      angular.forEach(modalCfgs,
        function(val, key){$modalsProvider.register(key, val);});
      $modalsProvider.appSelector = '[ng-app]';

      // No caching for development
      if ( window.location.host.match(/^localhost/) ) {
        $httpProvider.defaults.headers.get = {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: 0};}

      // Add interceptor for unauthenticated requests.
      $httpProvider.interceptors.push(
       ['$q', '$injector', function($q, $inj){
         var reqConfig;
         return {
           request: function(config){
             reqConfig = config;
             return $q.when(config)},
           responseError: function(resp){
             if ( resp.status===401 && !resp.config.ignored ) {
               // // Ignore response from all pending requests
               // $inj.get('$http').pendingRequests
               //   .forEach(function(cfg){
               //     cfg.ignored=true;});
               // return $inj.get('$auth').unauthenticated()
               //   .then(function(){
               //     return $inj.get('$http')(reqConfig);});
               window.location.reload();}  
             return $q.reject(resp);}};}]);
  }])

  .run(['$cookieStore', '$auth', '$tasks', '$rootScope', 'localStore', 'remoteStore', '$gclient',
    function($cookieStore, $auth, $tasks, $rootScope, localStore, remoteStore, $gclient) {

      // Grab user info from cookie if logged in.
      var userInfo = $cookieStore.get('user_info');
      if ( userInfo ) {
        $auth.user = userInfo;
        userInfo.gcals = {empty: 1};
        $tasks.addStore(remoteStore, true);}
      else $tasks.addStore(localStore, true);
      $tasks.changeDay();
      $rootScope.welcome = !userInfo;

      // Google API clientId and apiKey
      $gclient.init($cookieStore.get('google_api_config'));

      // Delete unneeded cookies
      ['user_info', 'goggle_api_config'].forEach(
        function(i){$cookieStore.remove(i);});

      // Attach logout function to rootScope.
      $rootScope.logOut = function(){$auth.logOut()
        .then(function(){window.location.reload()});};

  }]);
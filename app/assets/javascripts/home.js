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

angular.module("app", 
  ['tasks', 'util', 'bootstrapModal', 'auth', 'google', 'ngCookies'])

  .controller('viewCtrl', 
    ['$scope', '$tasks', 'hoursArray', 'Time', '$modals', '$auth', '$window',
      function($scope, $tasks, hoursArray, Time, $modals, $auth, $window) {
        var timeline = $tasks.timeline;

        $scope.modals = $modals;
        $scope.auth = $auth;
        $scope.tasks = $tasks;
        $scope.dayText = "That's";
        $scope.wake = new Time(420);
        $scope.sleep = new Time(1380);

        $scope.$watch('auth.user', function(u){
          $scope.displayName = u ? u.name.split(/ +/)[0] : 'Demo';}, 
        true);

        function resetWakeSleep(){
          var wake = $scope.wake,
            sleep = $scope.sleep,
            u = $auth.user;
          if ( u ) {
            wake.fromTime(u.wake);
            sleep.fromTime(u.sleep);
          } else {
            wake.minutes = 420;
            sleep.minutes = 1380;}}

        $scope.$watch('tasks.date',
          function(newDay, oldDay) {
           // Update dayText
            var delta = Math.round((newDay.getTime()-(new Date()).getTime())/oneDay);
            var dayText = "That's";
            var count, prep;
            if ( delta ) {
              count = Math.abs(delta);
              prep = delta < 0 ? "before" : "after";
              var plural = count > 1 ? "s " : ' ';
              dayText = count+" "+" day"+plural+prep;
            }
            $scope.dayText = dayText;

            // Set wake/sleep based on assigned tasks for this day.
            resetWakeSleep();
            if ( !timeline.length ) return;
            var first = timeline[0].start;
            var last = timeline[timeline.length-1].start;
            if ( first.lt($scope.wake) )
              $scope.wake = first.floor();
            if (last.gt($scope.sleep) )
              $scope.sleep = last.ceil();
          }, true);

        // Logic to update now marker //

        var now = new Time(new Date);
        var nowMarker = $('#now-marker');
        var intvlId;
        function updateNowMarker(){
          now.fromDate(new Date());
          if ( now.gt($scope.sleep) || now.lt($scope.wake) ) 
            nowMarker.hide();
          else nowMarker.show().css('top', now.toOffset($scope.wake));}

        resetWakeSleep();
        updateNowMarker()
        setInterval(updateNowMarker, 60000);

        // Wake/sleep watcher //

        $scope.$watch('wake+""+sleep', function(v) {
          if ( !v ) return;
          $scope.hours = hoursArray($scope.wake, $scope.sleep);
          updateNowMarker();
        });
                             
        // Task maniplulation functions //
        $scope.deleteTask = function(task) {
          if ( $window.confirm("Are you sure you want to delete this task?") )
            task.delete();};

        $scope.unassign = function(task) {task.update({start: null});};
  }])

  .directive('task', ['$compile', 'closest', 'Time', 'Minutes',
    function($compile, closest, Time, Minutes) {
      return {
        restrict: 'E',
        templateUrl: 'angular/task.html',
        replace: true,
        link: function(scope, el) {
          var snapTolerance = 60;
          var timeDroppable = $('.time-droppable');
          var task = scope.task;
          var style = scope.style = {};

          scope.start = task.start ? new Time(task.start.minutes) : null;
          scope.drag = false;
          scope.resize = false;
          
          scope.range = function() {
            if ( !scope.start ) return '';
            var begin = scope.start,
                end = scope.start.add(task.duration);
            return begin+' - '+end;};

          function setHeight(h){
            if ( h ) {
              style.height = h;
              if ( style.height < ( 8+14 ) ) style.fontSize = style.height-8;
              else style.fontSize = null;
            } else style.height = style.fontSize = null;};

          scope.$watch('drag', function(d){
            if ( !task.start ) {              
              if ( d ) setHeight(task.duration.pixels());
              else setHeight(null);}});
          
          scope.$watch('task.duration', 
            function(d){
              scope.durStr = d.toString();
              if (task.start) setHeight(d.pixels());},
            true);

          scope.$watch('wake', 
            function(w){
              if ( task.start ) style.top = task.start.toOffset(w);},
            true);

          scope.$watch('task.start', 
            function(s){
              if ( s ) style.top = task.start.toOffset(scope.wake);}, 
            true);

          scope.$watch('task.offset', function(o){style.left = o * 10;});
          
          scope.getClass = function (){
            var val = 'pri-'+task.priority,
              height = el.height();
            if ( height < (6+28) ) val += ' single-line';
            if ( task.start===null ) val += ' clearfix';
            if ( scope.drag ) val += ' drag';
            return val;};

          // Task is not draggable/resizable if not editable
          if ( !task.editable ) return;
          
          // Set CSS/draggable based on whether assigned or not
          if (task.start!==null) {
            el.draggable({containment: ".time-droppable"});
            el.resizable({handles: 's',
              containment: ".timeline",
              resize: function(e,ui){
                scope.$apply(function(){
                  task.duration.fromPx(closest(5, ui.size.height));});},
              start: function(){scope.resize=true;},
              stop: function(e,ui){
                setTimeout(function(){
                scope.$apply(
                  function(){
                    scope.resize=false;
                    task.update();});});}});
          } else {
            el.draggable(
              {containment: ".dayframe",
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
             snapTolerance: snapTolerance,
             revert: 'invalid',
             start: function(e, ui){
               if ( !task.start ) el.hide();
               scope.$apply('drag=true'); },
             stop: function(e, ui){
               if ( !scope.start ) el.show();
               else {
                 setTimeout(function(){scope.$apply(function(){
                   if ( task.start ) task.start.fromTime(scope.start);
                   else task.start = new Time(scope.start.minutes);
                   el.css('top', scope.start.toOffset(scope.wake));
                   task.update();});});}
               scope.$apply('drag=false');},
             drag: function(e, ui) {
               var dLeft = ui.offset.left,
                   tLeft = timeDroppable.offset().left;
               if ( Math.abs(dLeft-tLeft) <= snapTolerance ) {                 
                 var dTop = ui.helper.offset().top, 
                   offset = dTop - timeDroppable.offset().top;
                 offset = closest(5, offset);
                 scope.$apply(
                   function(){
                     if ( scope.start ) scope.start.fromOffset(offset, scope.wake);
                     else scope.start = new Time(offset, scope.wake);});
               } else scope.$apply(function(){scope.start=null;});
          }});
  }};}])

  .directive('timeDroppable', 
    function() {return {
      restrict: 'C',
      link: function(scope, el) {el.droppable();}};})

  .directive('hourSelect',
    ['$tasks', function($tasks) {
       var timeline = $tasks.timeline;
       return {
         scope: {time:'=hourSelect', which:'@hourSelect'},
         templateUrl: 'angular/hour_select.html',
         controller: ['$scope', function($scope) {
           $scope.up = function() {
             if ( $scope.which==='wake' ) {
               var firstTask = timeline[0];
               if ( firstTask ) {
                 if ( $scope.time.diff(firstTask.start).min > -60 ) return;
               } else if ( $scope.$parent.sleep.diff($scope.time).min < 120 ) return;}
             $scope.time.addIn(60);};
           $scope.down = function(){
             if ( $scope.which==='sleep') {
               var lastTask = timeline[timeline.length-1];
               if ( lastTask ) {
                 var endTime = lastTask.start.add(lastTask.duration);
                 if ( $scope.time.diff(endTime).min < 60 ) return;
               } else if ( $scope.time.diff($scope.$parent.wake).min < 120 ) 
                 return;
             } else if ( $scope.time.minutes <= 0 ) return;
             $scope.time.addIn(-60);};}]};}])

  .controller('taskModalCtrl',
    ['$scope', '$close', 'Time', 'Minutes', '$tasks', 'closest',
    function($scope, $close, Time, Minutes, $tasks, closest) {
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
        tmpl.duration = new Minutes($scope.dur.hr, closest(5, $scope.dur.min));
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
          $scope.submitError = false;
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

      $scope.$watchCollection('fields', function(f){
        if ( f.email && f.passwd ) $scope.invalid = false;
        else $scope.invalid = true;});

      $scope.close = $close;

      $scope.logIn = function(){
        $scope.submitError = false;
        $auth.logIn(fields)
          .then(
            function(){
              $close();
              $auth.logInTransition();},
            function(){$scope.submitError = true;});};
  }])

  .controller('accountModalCtrl',
    ['$scope', '$auth', '$close', '$tasks', '$gCalManager', 'Time',
      function($scope, $auth, $close, $tasks, $gCalManager, Time){
        $scope.invalid = false;
        $scope.submitError = false;

        var u = $scope.user = angular.copy($auth.user);
        $scope.$broadcast('userReady');
        u.wake = $auth.user.wake;
        u.sleep = $auth.user.sleep;
        u.duration = u.sleep.diff(u.wake);

        var errs = $scope.errors = {name:null, wake:null, duration:null};

        $scope.$watch('user', function(u){
          if ( !u.name ) errs.name = "Name is required!";
          else errs.name = null;

          if ( !u.wake ) errs.wake = "Wake time is invalid!";
          else errs.wake = null;

          if ( !u.duration || !u.duration.min ) 
            errs.duration = "Duration is invalid!";
          else errs.duration = null;

          if ( u.wake && u.duration && u.duration.min ) {
            u.sleep.minutes = u.wake.minutes+u.duration.min;
            $scope.sleepDisplay = u.sleep.toString();
          } else $scope.sleepDisplay = "?";

          for ( var k in errs ){
            if ( errs[k] ){$scope.invalid = true; return;}}
          $scope.invalid = false;
        }, true);

        $scope.close = $close;

        $scope.update = function(){
          $auth.update(u).then(
            function(){
              $gCalManager.update(u.gcals) && $tasks.changeDay();
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
    ['Time', function(Time){
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
  }])

  .directive('hourInput', 
    ['Minutes', function(Minutes){
      return {
        restrict: 'A',
        require: 'ngModel',
        link: function(s, e, a, ctrl){
          ctrl.$parsers.push(
            function(i){
              var mv = ctrl.$modelValue;
              if ( i < 0 || i===undefined ) return null;
              if ( mv ) {
                mv.min = i*60;}
              else {
                mv = new Minutes(i*60);}
              return mv;});
          ctrl.$formatters.push(
            function(i){return i ? (i.min/60) : null;});}};
  }])

  .directive("autofill", 
    ['$timeout', '$interval', 
    function ($timeout, $interval) {
      return {
        require: "ngModel",
        link: function ($scope, el, a, ctrl) {
          var v;
          function fill(){
            v = el.val();
            v && ctrl.$setViewValue(v);}
          $timeout(fill, 200);
          var p = $interval(fill, 1000);
          el.on('$destroy', function(){$interval.cancel(p);});}};
  }])

  .directive('widgetArea',
    ['affixTop',
    function(affixTop){
      return {
        restrict: 'C',
        link: function($scope, $el){
          //var myWindow = angular.element($window);
          var fixedClass = 'fixed';
          if ( !$scope.welcome ) $el.addClass(fixedClass);
          else {
            var offFun = affixTop($el, fixedClass, true);
            $scope.$on('fixWidgetArea', function(){
              $el.addClass(fixedClass);
              offFun();});}}};
  }])

  .directive('instruction', ['affixTop',
    function(affixTop){ return {
      restrict: 'C',
      link: function($scope, $el){
        var fixedClass = "fixed";
        if ( !$scope.welcome ) $el.addClass(fixedClass);
        else {
          var offFun = affixTop($el, fixedClass, true);
          $scope.$on('fixWidgetArea', function(){offFun();});}}};
  }])

  .controller('googleCalSelectCtrl', 
    ['$scope', '$gclient',
    function($scope, $gclient){
      $scope.state = 1;

      $scope.$on('userReady', function(){
        if ( !$scope.user.gcals ) $scope.state = 0;
        else $scope.init();});

      $scope.init = function(){
        var cals = $scope.cals = {};
        if ( $scope.state === 0 ) $scope.user.gcals = {};
        $scope.state = 1;
        $gclient.load('calendar', 'v3')
          .then(
            function(){return $gclient.calendar.calendarList.list();},
            function(){$scope.state = 0;})
          .then(function(resp){
            angular.forEach(resp.items, function(c){
              cals[c.id] = c;
              if ( $scope.user.gcals[c.id] ) c.sel = true;});
            $scope.state = 2;});};

      $scope.toggle = function(c){
        if ( c.sel ) delete $scope.user.gcals[c.id];
        else $scope.user.gcals[c.id] = c.id;
        c.sel = !c.sel;};
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
               // // FIXME: Commented out because issues with devise
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

  .run(['$auth', '$tasks', '$rootScope', '$gclient', '$document',
    function($auth, $tasks, $rootScope, $gclient, $document) {
      // Grab user info for auth initialization
      var $userInfo = $document.find('#user-info');
      $auth.init(JSON.parse($userInfo.text()));
      $rootScope.welcome = !$auth.user;

      // Grab Google API clientId and apiKey
      var $googleCfg = $document.find('#google-config');
      $gclient.init(JSON.parse($googleCfg.text()));

      $tasks.changeDay();

      // $googleCfg.remove(); $userInfo.remove();

      // Attach logout function to rootScope.
      $rootScope.logOut = function(){
        $auth.logOut().then(function(){window.location.reload()});};
  }]);
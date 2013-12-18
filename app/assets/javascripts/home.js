//= require angular
//= require angular-cookies
//= require jquery.ui.draggable
//= require jquery.ui.droppable
//= require jquery.ui.resizable
//= require util
//= require task_services
//= require modal
//= require auth

var app = angular.module("app", ['tasks', 'util', 'bootstrapModal', 'auth', 'ngCookies'])

  .controller('viewCtrl', ['$scope', '$tasks', 'hoursArray', 'Time', '$modals', '$window', '$auth',
                           function($scope, $tasks, hoursArray, Time, $modals, $window, $auth) {
                             $scope.modals = $modals;
                             $scope.auth = $auth;
                             $scope.tasks = $tasks;
                             $scope.signInFields = {email: null, passwd: null};
                             
                             $scope.logIn = function() {
                               var f = $scope.signInFields;
                               $auth.logIn(f.email, f.passwd, f.remember)
                                 .then(
                                  function(){$auth.logInTransition();},
                                  function(respObj) {
                                    if ( 'errors' in respObj ) {
                                      console.log(respObj.errors);
                                      return;}
                                    delete $scope.signInFields;})};

                             // Day and wake/sleep watchers //

                             var timeline = $tasks.timeline;                             
                             $scope.$watch('tasks.date',
                                           function() {
                                             $scope.wake = new Time('7:00');
                                             $scope.sleep = new Time('22:00');
                                             if ( !timeline.length ) return;
                                             var first = timeline[0].start;
                                             var last = timeline[timeline.length-1].start;
                                             if ( first.lt($scope.wake) )
                                               $scope.wake = first.floor();
                                             if (last.gt($scope.sleep) )
                                               $scope.sleep = last.ceil();},
                                           true);
                             
                             $scope.$watch('wake+""+sleep', function(v) {
                                             if ( !v ) return;
                                             $scope.hours = hoursArray($scope.wake, $scope.sleep);});

                             
                             // Task maniplulation functions //

                             $scope.deleteTask = function(task) {
                               if ( $window.confirm("Are you sure you want to delete this task?") ){
                                 task.delete();
                               }
                             };

                             $scope.unassign = function(task) { task.update({start: null}); };

                           }])

  .directive('task', ['$compile',
                      function($compile) {
                        return { restrict: 'E',
                                 templateUrl: 'angular/task.html',
                                 replace: true,
                                 controller: function($scope) {
                                   $scope.duration = null;
                                   $scope.$watch('task.duration',
                                                 function(d) {$scope.duration = d.toString();},
                                                 true);
                                 },
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
                                     if ( height < (6+28) ) {
                                       val += ' single-line';
                                     }
                                     if (task.start===null)
                                       val += ' clearfix';
                                     return val;
                                   };
                                   
                                   // Set CSS/draggable based on whether assigned or not
                                   if (task.start!==null) {
                                     el.draggable({stack: true,
                                                   containment:'.time-droppable'});
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
                                     {snap: ".snap",
                                      snapMode: "inner",
                                      snapTolerance: 25,
                                      revert: 'invalid',
                                      start: function(){
                                        if ( task.start===null )
                                          el.hide();
                                        scope.$apply('drag=true'); },
                                      stop: function(){
                                        if ( task.start===null )
                                          el.show();
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
               return {restrict: 'C',
                       link: function(scope, el) {                        
                         el.droppable(
                           {drop: function (event, ui) {
                              var taskScope = ui.draggable.scope();
                              setTimeout(function(){taskScope.$apply('task.update()');});}});}};})

  .directive('hourSelect',
             ['$tasks', function($tasks) {
                var timeline = $tasks.timeline;
                return { scope: { time: '=hourSelect', which: '@hourSelect' },
                         templateUrl: 'angular/hour_select.html',
                         controller: function($scope) {
                           $scope.up = function() {
                             var firstTask = timeline[0];
                             if ( $scope.which==='wake' && firstTask )
                               if ( $scope.time.diff(firstTask.start).min > -60 ) return;
                             $scope.time.addIn(60);};
                           $scope.down = function(){
                             var lastTask = timeline[timeline.length-1];
                             if ( $scope.which==='sleep' && lastTask ) {                               
                               var endTime = lastTask.start.add(lastTask.duration);
                               if ( $scope.time.diff(endTime).min < 60 ) return;
                             }
                             $scope.time.addIn(-60);};
                         }};}])

  .controller('taskModalCtrl', ['$scope', '$close', 'Time', 'Minutes', '$tasks',
                                function($scope, $close, Time, Minutes, $tasks) {
                $scope.tmpl = {};
                $scope.dur = {hr: null, min: null};
                $scope.invalid = false;
                $scope.errors = {dur: null, title: null, start: null};

                $scope.$watch('tmpl.title', function() {
                                var error = null;
                                if ( !$scope.tmpl.title ) {
                                  error = "Title cannot be blank.";
                                }
                                $scope.errors.title = error;
                              });

                $scope.$watch('dur', function(dur) {
                                if ( dur.min > 59 ) {
                                  dur.hr += Math.floor(dur.min / 60);
                                  dur.min = dur.min % 60;
                                }
                                if ( dur.hr > 23 )
                                  dur.hr = 23;                                         
                                var error = null;
                                if ( (!dur.min && !dur.hr) || (!dur.hr && dur.min < 10) ) {
                                  error = "Duration must at least 10 minutes.";
                                } else if ( dur.min % 5 ) {
                                  error = "Duration must be a multiple of 5 mintues.";
                                }
                                $scope.errors.dur = error;
                              }, true);

                $scope.$watch('errors', function(errs){
                                for (var k in errs) {
                                  if ( errs[k] ) {
                                    $scope.invalid = true;
                                    return;
                                  }
                                }
                                $scope.invalid = false;
                              }, true);

                $scope.close = $close;

                $scope.save = function() {
                  var tmpl = $scope.tmpl;
                  tmpl.duration = new Minutes($scope.dur.hr, closest5($scope.dur.min));
                  tmpl.start = tmpl.start ? new Time(tmpl.start) : null;
                  tmpl.priority = parseInt(tmpl.priority);
                  // Editing existing task
                  if ( 'id' in tmpl ) {
                    $tasks.get(tmpl.id).update($scope.tmpl);
                    // Creat new task
                  } else {
                    $tasks.create(tmpl);
                  }
                  $close();
                };
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

  .directive('widgetArea',
    ['$auth',
      function($auth){
        return {restrict: 'C',
          link: function($scope, $el){
            var $window = $(window);
            var fixedClass = 'fixed-top';
            if ( $auth.user ){
              $el.addClass('fixed-top');
              $window.off('scroll.fixWidgetArea');
            // Affix logic
            } else {
              var fixed = false;
              var top = $el.offset().top;
              $window.on('scroll.fixWidgetArea', function(){
                if ( fixed ) {
                  if ( $window.scrollTop() < top ){
                    fixed = false;
                    $el.removeClass(fixedClass);}
                  } else if ( $window.scrollTop() >= top ){
                    fixed = true;
                    $el.addClass(fixedClass);}});}
            $scope.$on('fixWidgetArea', function(){
              $el.addClass(fixedClass);
              $window.off('scroll.fixWidgetArea');});}};}])

  .constant('modalCfgs', {task: {tmplUrl: 'angular/task_modal.html',
                                 ctrl: 'taskModalCtrl',
                                 open: function(t) {
                                   var scopeExt = {};
                                   scopeExt.header = t==null ? "Create Task" : "Edit Task";
                                   var tmpl = t && angular.copy(t) || {title: "New Task", start: null,
                                                                       priority: 3, description: null};
                                   scopeExt.dur =  t ? t.duration.withHrs() : {hr: 0, min: 30};
                                   tmpl.start = tmpl.start ? tmpl.start.toForm() : null;
                                   scopeExt.tmpl = tmpl;
                                   return scopeExt;
                                 }},
                          signUp: {tmplUrl: 'angular/signup_modal.html',
                                   ctrl: 'signUpModalCtrl',
                                   open: angular.noop}
            })

  .config(['$modalsProvider', 'modalCfgs',
           function($modalsProvider, modalCfgs) {
             angular.forEach(modalCfgs,
               function(val, key){$modalsProvider.register(key, val);});
             $modalsProvider.appSelector = '[ng-app]';
           }])

  .run(['$cookieStore', '$auth', '$tasks',
        function($cookieStore, $auth, $tasks) {
          var userInfo = $cookieStore.get('user_info');
          if ( userInfo ) {
            $auth.user = userInfo;
            $tasks.remote(true);}
          $tasks.changeDay();
          ['user_info'].forEach(function(i){$cookieStore.remove(i);});
        }]);
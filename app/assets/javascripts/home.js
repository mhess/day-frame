//= require angular
//= require jquery.ui.draggable
//= require jquery.ui.droppable
//= require jquery.ui.resizable
//= require util
//= require task_services
//= require bootstrap/modal

var app = angular.module("app", ['taskServices', 'util'])

  .controller('viewCtrl', ['$scope', 'TaskService', 'hoursArray', 'Time',
                           function($scope, TaskService, hoursArray, Time) {
                             // State for this controller
                             $scope.day = new Date();                             
                             $scope.modal = {active: false};                             
                             $scope.Tasks = TaskService;

                             var timeline = TaskService.timeline;
                             
                             $scope.changeDay = function(change) {
                               if ( change==null ) $scope.day = new Date();
                               else $scope.day.setDate($scope.day.getDate()+change);
                             };


                             // Day and wake/sleep watchers //
                             
                             $scope.$watch('day',
                                           function(day) {
                                             TaskService.setDay(day).then(
                                               function() {
                                                 $scope.wake = new Time('7:00');
                                                 $scope.sleep = new Time('22:00');
                                                 if ( !timeline.length ) return;
                                                 var first = timeline[0].start;
                                                 var last = timeline[timeline.length-1].start;
                                                 if ( first.lt($scope.wake) )
                                                   $scope.wake = first.floor();
                                                 if (last.gt($scope.sleep) )
                                                   $scope.sleep = last.ceil();
                                               });});
                             
                             $scope.$watch('wake+""+sleep', function(v) {
                                             if ( !v ) return;
                                             $scope.hours = hoursArray($scope.wake, $scope.sleep);
                                           });

                             
                             // Task maniplulation functions //

                             $scope.deleteTask = function(task) {
                               if (window.confirm("Are you sure you want to delete this task?")){
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
                                                       function() {task.save(); scope.resize=false;});
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
               return { restrict: 'C',
                        link: function(scope, el) {                        
                          el.droppable(
                            {drop: function (event, ui) {
                               //var offset = closest5(ui.offset.top - el.offset().top);
                               var taskScope = ui.draggable.scope();
                               taskScope.$apply(
                                 function(){taskScope.task.update();});
                             }});
                        }        
                      };})

  .directive('taskModal', ['Minutes', 'Time',
                           function(Minutes, Time) {
                             return {restrict: 'C',
                                     scope: true,
                                     templateUrl: 'angular/task_modal.html',
                                     controller: function($scope) {
                                       $scope.tmpl = {};
                                       $scope.invalid = false;
                                       $scope.dur = {hr: null, min: null};
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

                                       $scope.save = function() {
                                         var tmpl = $scope.tmpl;
                                         tmpl.duration = new Minutes($scope.dur.hr, closest5($scope.dur.min));
                                         tmpl.start = tmpl.start ? new Time(tmpl.start) : null;
                                         tmpl.priority = parseInt(tmpl.priority);
                                         // Editing existing task
                                         if ( 'id' in $scope.tmpl ) {
                                           $scope.Tasks.get(tmpl.id).update($scope.tmpl);
                                         // Creat new task
                                         } else {                                           
                                           $scope.Tasks.create(tmpl);
                                           }
                                         $scope.close();
                                       };
                                     },
                                     link: function(scope, el, attr) {
                                       //el.modal({show: false});

                                       // Register this directive/modal's handle on the
                                       // parent controller's modal object
                                       scope.modal.task = function(t) {
                                         el.modal('show');
                                         scope.header = t==null ? "Create Task" : "Edit Task";
                                         var tmpl = t && angular.copy(t) || {title: "New Task", start: null,
                                                                             priority: 3, description: null};
                                         scope.dur =  t ? t.duration.withHrs() : {hr: 0, min: 30};
                                         tmpl.start = tmpl.start ? tmpl.start.toForm() : null;
                                         angular.extend(scope.tmpl, tmpl);
                                       };

                                       scope.close = function() {
                                         el.modal('hide');
                                       };
                                     }
                                    };}])
  .directive('hourSelect',
             ['TaskService', function(TaskService) {
                var timeline = TaskService.timeline;
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
                         }};}]);
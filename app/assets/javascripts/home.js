//= require angular
//= require jquery.ui.draggable
//= require jquery.ui.droppable
//= require jquery.ui.resizable
//= require util
//= require task_services
//= require bootstrap/modal

var app = angular.module("app", ['taskServices', 'util'])

  .filter('assigned', function(){
            return function(input, assigned) {
              var result = [];
              var pred = assigned ? function(s) {return s != null;} : function(s) {return s == null;};
              angular.forEach(input, function(i) {
                                if ( pred(i.start) ) result.push(i);
                              });
              return result;
            };})

  .controller('viewCtrl', ['$scope', 'TaskService', 'hoursArray', 'Time',
                           function($scope, TaskService, hoursArray, Time) {
                             // State for this controller
                             $scope.day = new Date();
                             $scope.wake = 420;   // 7am
                             $scope.sleep = 1380; // 10pm
                             $scope.modal = {active: false};
                             
                             // Services attached to this controller's scope
                             $scope.Tasks = new TaskService($scope);
                             
                             $scope.changeDay = function(change) {
                               if ( change==null ) {
                                 $scope.day = new Date();
                               } else { $scope.day.setDate($scope.day.getDate()+change); }
                             };
                             
                             $scope.$watch('wake+""+sleep', function() {
                                             $scope.hours = hoursArray($scope.wake, $scope.sleep);
                                           });
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
                                   scope.start = task.start;
                                   scope.drag = false;
                                   
                                   scope.$watch('task.duration.min+""+task.start',
                                                function(){scope.start=task.start;
                                                           scope.duration=task.duration;});

                                   scope.range = function(){
                                     if ( !scope.start ) return '';
                                     var begin = scope.start,
                                         end = scope.start.add(task.duration);
                                     return begin+' - '+end;
                                   };                                   

                                   // Set task element style according to model object
                                   // properties (start, duration)
                                   scope.getStyle = function() {
                                     var styles = {};
                                     if (scope.drag || scope.start !== null) {
                                       styles.height = task.duration.pixels();
                                       if ( task.start!==null )
                                         angular.extend(
                                           styles,
                                           {top: scope.start.toOffset(scope.wake),
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
                                     return val;
                                   };
                                   
                                   scope.deleteTask = function() {
                                     if (window.confirm("Are you sure you want to delete this task?")){
                                       scope.Tasks.delete(task.id);
                                     }
                                   };

                                   // Set CSS/draggable based on whether assigned or not
                                   if (task.start!=null) {
                                     el.draggable({containment:'.time-droppable'});
                                     el.resizable({handles: 's', grid: [0, 5],
                                                   containment:'parent',
                                                   resize: function(e,ui){
                                                     scope.$apply(
                                                       function(){task.duration.fromPx(closest5(ui.size.height));}
                                                     );},
                                                   stop: function(e,ui){
                                                     scope.$apply(
                                                       function() {task.save();});
                                                   }
                                                  });
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
                                   
                                   el.draggable(
                                     {snap: ".snap",
                                      snapMode: "inner",
                                      snapTolerance: 25,
                                      revert: 'invalid',
                                      start: function(event, ui) {
                                        if ( task.start===null ) {
                                          el.hide();
                                          scope.$apply('drag=true');
                                        }
                                      },
                                      stop: function(event, ui) {
                                        if (task.start===null) {
                                          el.show();
                                          scope.$apply('drag=false');
                                        }
                                      },
                                      drag: function(e, ui) {
                                        var dLeft = ui.offset.left,
                                            tLeft = timeDroppable.offset().left;
                                        if ( Math.abs(dLeft-tLeft) <= 25 ) {
                                          var offset = ui.helper.offset().top - timeDroppable.offset().top;
                                          offset = closest15(offset);
                                          scope.$apply(function(){scope.start = new Time(offset, scope.wake);});
                                        } else {
                                          scope.$apply(function(){scope.start=null;});
                                        }
                                      }
                                     });
                                 }};}])

  .directive('timeDroppable', function() {
               return { restrict: 'C',
                        link: function(scope, el) {                        
                          el.droppable(
                            {drop: function (event, ui) {
                               var offset = closest5(ui.offset.top - el.offset().top);
                               var taskScope = ui.draggable.scope();
                               taskScope.$apply(
                                 function(){taskScope.Tasks.assign(taskScope.task.id, offset);});
                             }});
                        }        
                      };})

  .directive('taskModal', ['Minutes',
                           function(Minutes) {
                             return {restrict: 'C',
                                     scope: true,
                                     templateUrl: 'angular/task_modal.html',
                                     link: function(scope, el, attr) {
                                       scope.attr = attr;
                                       el.modal({show: false});
                                       scope.dur = {hr: null, min: null};
                                       var saveBtn = el.find('.btn-primary'),
                                           formGroups = {dur: el.find('.duration'),
                                                         title: el.find('.title'),
                                                         start: el.find('.start')};
                                       
                                       scope.errors = {dur: null, title: null, start: null};

                                       function toggleErr(fg, error) {                                         
                                         if ( error ) {
                                           formGroups[fg].addClass('has-error');
                                           scope.errors[fg] = error;
                                           saveBtn.prop('disabled', true);
                                         } else {
                                           formGroups[fg].removeClass('has-error');
                                           scope.errors[fg] = null;
                                           saveBtn.prop('disabled', false);
                                         }
                                       }
                                       
                                       scope.titleChange = function(){
                                         var error = null;
                                         if ( !scope.tmpl.title ) {
                                           error = "Title cannot be blank.";
                                         }
                                         toggleErr('title', error);
                                       };

                                       scope.durChange = function() {
                                         var dur = scope.dur;
                                         if ( dur.min > 59 ) {
                                           dur.hr += Math.floor(dur.min / 60);
                                           dur.min = dur.min % 60;
                                         }                                           
                                         var error = null;
                                         if ( (!dur.min && !dur.hr) || (!dur.hr && dur.min < 10) ) {
                                           error = "Duration must at least 10 minutes.";
                                         } else if ( dur.min > 59 ) {
                                           
                                         } else if ( dur.min % 5 ) {
                                           error = "Duration must be a multiple of 5 minutes.";
                                         }
                                         toggleErr('dur', error);
                                       };

                                       // Register this directive/modal's handle on the
                                       // controller's modal object
                                       scope.modal.task = function(t) {
                                         el.modal('show');
                                         scope.header = t==null ? "Create Task" : "Edit Task";
                                         var tmpl = t && angular.copy(t) || {title: "New Task", start: null,
                                                                             priority: 3, description: null};
                                         scope.dur =  t ? t.duration.withHrs() : {hr: 0, min: 30};
                                         tmpl.start = tmpl.start ? tmpl.start.toForm() : null;
                                         scope.tmpl = tmpl;
                                       };

                                       scope.startError = function () {};

                                       scope.save = function() {
                                         var tmpl = scope.tmpl;
                                         tmpl.duration = new Minutes(scope.dur.hr, closest5(scope.dur.min));
                                         tmpl.start = tmpl.start ? new Time(tmpl.start) : null;
                                         tmpl.priority = parseInt(tmpl.priority);
                                         if ( 'id' in scope.tmpl ) {
                                           scope.Tasks.modify(tmpl.id, tmpl);
                                         } else {                                           
                                           scope.Tasks.create(tmpl);
                                           }
                                         scope.close();
                                       };

                                       scope.close = function() {
                                         el.modal('hide');
                                       };
                                     }
                                    };}]);
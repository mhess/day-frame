//= require angular
//= require jquery.ui.draggable
//= require jquery.ui.droppable
//= require jquery.ui.resizable
//= require util
//= require task_services

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
                                   scope.duration = task.duration;                                   
                                   scope.start = task.start;
                                   scope.drag = false;

                                   scope.range = function(){
                                     if ( scope.start===null ) return '';
                                     var begin = scope.start.toString(),
                                         end = scope.start.add(scope.duration).toString(); 
                                     return begin+' - '+end;
                                   };

                                   // Set task element style according to model object
                                   // properties (start, duration)
                                   scope.getStyle = function() {
                                     var styles = {};
                                     if (scope.drag || scope.start !== null) {
                                       styles.height = task.duration;
                                       if ( task.start!==null )
                                         angular.extend(styles,
                                                        {position: 'absolute',
                                                         top: task.start.toOffset(scope.wake),
                                                         left: 0, height: scope.duration});
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
                                                     scope.$apply('duration='+closest5(ui.size.height));
                                                   },
                                                   stop: function(e,ui){
                                                     scope.$apply(
                                                       function() {
                                                         scope.Tasks.modify(task.id, {duration: scope.duration});
                                                       });
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
                                          offset = closest5(offset);
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
                               var taskId = ui.draggable.attr("x-task-id"),
                                   offset = closest5(ui.offset.top - el.offset().top);
                               scope.$apply(
                                 function() {scope.Tasks.assign(taskId, offset);}
                               );
                             }});
                        }        
                      };})

  .directive('taskModal', function() {
               return {restrict: 'C',
                       scope: true,
                       replace: true,
                       templateUrl: 'angular/task_modal.html',
                       link: function(scope, element, attrs) {

                         // This is the task being operated on by the modal as well
                         // as the flag which shows/hides the modal
                         scope.task = null;

                         // Register this directive/modal's handle on the
                         // controller's modal object
                         scope.modal.task = function(task) {
                           scope.modal.active = 'task';
                           scope.header = task==null ? "New Task" : "Edit Task";
                           scope.task = task || {};
                           scope.taskTmpl = {};
                           angular.extend(scope.taskTmpl, scope.task);
                         };

                         scope.save = function() {
                           if ( 'start' in scope.taskTmpl ) {
                             delete scope.taskTmpl.start;
                           }
                           if ( 'id' in scope.task ) {
                             scope.Tasks.modify(scope.task.id, scope.taskTmpl);
                           } else {
                             scope.Tasks.create(scope.taskTmpl);
                           }
                           scope.close();
                         };

                         scope.close = function() {
                           scope.modal.active=null;
                           scope.task=null;
                         };
                       }
                      };});
//= require util
//= require angularjs/rails/resource

angular.module('taskServices', ['rails', 'util'])
// The operations in the factory assume an $apply context

  .factory('TaskService',
           ['railsResourceFactory', 'date2day', 'setPixelFactor', 'Time', 'Minutes',
            function(railsResourceFactory, date2day, setPixelFactor, Time, Minutes) {
              return function(scope) {
                var taskSrvObj = this,
                    taskMap = {},
                    day;

                this.timeline = [];
                this.backlog = [];                   
                    
                setPixelFactor(1);

                var TaskRes = railsResourceFactory({ url: "/tasks", name: "task"});

                // Grab original resource update method                
                var resUpdate = TaskRes.prototype.update;
                TaskRes.prototype.update = function(ext) {
                  var task = this;
                  ext && angular.extend(task, ext);
                  task.day = task.start===null ? null : day;
                  resUpdate.call(task)
                    .then(function(data) {
                            var timeline = taskSrvObj.timeline;
                            var backlog = taskSrvObj.backlog;
                            if ( task.start===null ) {
                              timeline.indexOf(task) > -1 && timeline.splice(timeline.indexOf(task), 1);
                              backlog.indexOf(task) < 0 && backlog.push(task);
                            } else {
                              backlog.indexOf(task) > -1 && backlog.splice(backlog.indexOf(task), 1);
                              timeline.indexOf(task) < 0 && timeline.push(task);
                            }
                          },
                          function(){ alert("Task modification failed"); });
                };

                // Grab original resource delete method
                var resDelete = TaskRes.prototype.delete;                
                TaskRes.prototype.delete = function() {
                  var task = this;
                  resDelete.call(task).then(
                    function(){
                      if ( task.start===null ) {
                        backlog.splice(backlog.indexOf(task), 1);
                      } else {
                        timeline.pop(task);
                      }
                    },
                    function(){alert("Task deletion failed");}
                  );
                };

                TaskRes.beforeRequest(function(data){
                                        var copy = angular.copy(data);
                                        if ( "start" in copy && copy.start ) {
                                          angular.extend(copy, {start: data.start.minutes});
                                        }
                                        copy.duration = copy.duration.min;
                                        return copy;
                                      });
                
                function taskFromServ(task) {
                  taskMap[task.id] = task;
                  task.duration = new Minutes(task.duration);
                  if ( task.start===null ) {
                    taskSrvObj.backlog.push(task);
                  } else {
                    task.start = new Time(task.start);
                    taskSrvObj.timeline.push(task);
                  }
                }
                
                this.get = function(tid){ return taskMap[tid]; };

                this.create = function(taskProps) {
                  if ( "start" in taskProps && taskProps.start )
                    taskProps.day = day;
                  new TaskRes(taskProps).create()
                    .then(function(task) { taskFromServ(task); },
                          function() { alert("Task creation failed"); });
                };

                this.update = function(dateObj) {
                  day = date2day(dateObj);
                  this.backlog = [];
                  this.timeline = [];
                  taskMap = {};
                  TaskRes.query({day: day})
                    .then(function(res) { res.forEach(taskFromServ); });
                };

                scope.$watch('day', function () { taskSrvObj.update(scope.day); }, true);
              };
            }]);
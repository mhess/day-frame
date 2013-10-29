//= require util
//= require angularjs/rails/resource

angular.module('taskServices', ['rails', 'util'])
// The operations in the factory assume an $apply context

  .factory('TaskService',
           ['railsResourceFactory', 'date2day', 'setPixelFactor', 'Time', 'Minutes',
            function(railsResourceFactory, date2day, setPixelFactor, Time, Minutes) {
              return function(scope){

                setPixelFactor(1);

                var TaskRes = railsResourceFactory({ url: "/tasks",
                                                     name: "task"});

                TaskRes.beforeRequest(function(data){
                                        var copy = angular.copy(data);
                                        if ( "start" in copy && copy.start ) {
                                          angular.extend(copy, {start: data.start.minutes});
                                        }
                                        copy.duration = copy.duration.min;
                                        return copy;
                                      });
                
                var day;
                var taskMap = {};
                var taskSrvObj = this;

                function taskFromServ(task) {
                  task.start = task.start===null ? null : new Time(task.start);
                  task.duration = new Minutes(task.duration);
                  taskSrvObj.add(task);
                }
                
                this.update = function(dateObj) {
                  day = date2day(dateObj);
                  this.list = [];
                  taskMap = {};
                  TaskRes.query({day: day})
                    .then(function(res) {
                            angular.forEach(res, taskFromServ);
                          });
                };

                this.add = function(taskObj) {
                  this.list.push(taskObj);
                  taskMap[taskObj.id] = taskObj;
                };
                
                this.remove = function(taskObj) {
                  var index = this.list.indexOf(taskObj);
                  this.list.splice(index, 1);
                  delete taskMap[taskObj.id];
                };

                this.modify = function(id, props) {
                  if ('start' in props ) {
                    if ( props.start===null ) {
                      props.day = null;
                    } else {
                      props.day = day;
                    }
                  }
                  angular.extend(taskMap[id], props)
                    .update().then(angular.noop,
                                   function(){ alert("Task modification failed"); });
                };

                this.create = function(taskProps) {
                  if ( "start" in taskProps ) taskProps.day = day;
                  new TaskRes(taskProps).create()
                    .then(function(data) { taskFromServ(data); },
                          function() { alert("Task creation failed"); });
                };

                this.assign = function(id, offset) {
                  var start = taskMap[id].start;
                  start = start===null ? new Time(offset, scope.wake) : start.fromOffset(offset, scope.wake);
                  this.modify(id, {start: start});
                };

                this.unassign = function(id) {
                  this.modify(id, {start: null});
                };

                this.delete = function(id) {
                  var task = taskMap[id];
                  task.delete()
                    .then(function(){ taskSrvObj.remove(task); },
                          function(){ alert("Task deletion failed"); });
                };

                scope.$watch('day', function () { taskSrvObj.update(scope.day); }, true);
              };
            }]);
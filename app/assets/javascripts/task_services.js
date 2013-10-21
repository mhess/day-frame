//= require util
//= require angularjs/rails/resource

angular.module('taskServices', ['rails', 'util'])
// The operations in the factory assume an $apply context

  .factory('TaskService',
           ['railsResourceFactory', 'date2day', function(railsResourceFactory, date2day) {
              return function(scope){

                Time.prototype.setPixelFactor(1);

                var Task = railsResourceFactory({ url: "/tasks",
                                                  name: "task"});

                Task.beforeRequest(function(data){
                                     if ( "start" in data && data.start ) {
                                       return angular.extend(angular.copy(data), {start: data.start.minutes});
                                     }
                                     return data;
                                  });

                Task.beforeResponse(function(data) {
                                     if (angular.isArray(data)) {
                                       angular.forEach(data, function(task){
                                                         task.start = task.start===null ? null : task.start= new Time(task.start);});
                                     } else {
                                       data.start = data.start===null ? null : new Time(data.start);  
                                     }                                     
                                  });
                
                var day;
                var taskMap = {};
                var taskSrvObj = this;
                
                this.update = function(dateObj) {
                  day = date2day(dateObj);
                  this.list = [];
                  taskMap = {};
                  Task.query({day: day})
                    .then(function(res) {
                            angular.forEach(res, function(task) { taskSrvObj.add(task); });
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

                this.assign = function(id, offset) {
                  var start = taskMap[id].start;
                  start = start===null ? new Time(offset, scope.wake) : start.fromOffset(offset, scope.wake);
                  this.modify(id, {start: start});
                };

                this.unassign = function(id) {
                  this.modify(id, {start: null});
                };

                this.create = function(taskProps) {
                  if ("start" in taskProps ) taskProps.day = day;
                  var task = new Task(angular.extend(taskProps));
                  task.create()
                    .then(function() { taskSrvObj.add(task); },
                          function() { alert("Task creation failed"); });
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
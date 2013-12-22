//= require modal
//= require task_services

angular.module('auth', ['bootstrapModal', 'tasks'])
.service('$auth',
  ['$http', '$rootScope', '$window', '$modals', '$tasks', '$q',
  function($http, $rootScope, $window, $modals, $tasks, $q) {

    var that = this;
    var $welcome = $('.welcome');

    this.logInTransition = function(){
      $welcome.slideUp(1000,
        function(){
          $rootScope.$apply(function(){
            $tasks.remote(true).changeDay();
            $rootScope.$broadcast('fixWidgetArea');
            $rootScope.welcome = false;});});}

    this.logInPath = '/users/sign_in.json'; //config.signInPath;
    this.registerPath = '/users.json'; //config.registerPath;
    this.signOutPath = '/users/sign_out';
    this.user = null;

    var postData = {
        remote: true,
        commit: null,
        utf8: "✓",
        user: null};

    this.logIn = function(fields) {
      fields.rem = fields.rem ? 1 : 0;
      postData.user = {
        email: fields.email, 
        password: fields.passwd, 
        remember: fields.rem};
      postData.commit = "Sign in";
      return $http.post(this.logInPath, postData)
        .then(
          function(resp){
            that.user = resp.data;
            return resp.data;},
          function(resp){throw resp.data;});};

    this.signUp = function(usr){
      postData.user = usr;
      postData.user.password = usr.passwd;
      postData.user.password_confirmation = usr.passwdCnf;
      postData.commit = "Sign up";
      return $http.post(this.registerPath, postData)
        .then(
          function(resp){
            this.user = resp.data;
            return resp.data;},
          function(resp){return $q.reject(resp.data);});};

    this.logOut = function(){
      return $http.delete(that.signOutPath);};

    this.unauthenticated = function(){
      // return $modals.logIn()
      //   .catch(function(){window.location.reload();});
      };
  }]);
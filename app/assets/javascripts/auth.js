angular.module('auth', [])
  .service('$auth',
           ['$http', '$rootScope', '$window', 
            function($http, $rootScope, $window) {
              var headers = {},
                  that = this;
              headers['Content-Type'] = 'application/json';
              headers['Accept'] = 'application/json';
              //this.setup = function(config) {
              this.logInPath = '/users/sign_in.json'; //config.signInPath;
              this.registerPath = '/users/sign_up.json'; //config.registerPath;
              this.signOutPath = '/users/sign_out';
              //};
              this.logIn = function(email, pass, rem) {
                var rem = rem ? 1 : 0,
                    postData = {remote: true,
                                commit: "Sign in",
                                utf8: "✓",
                                user: {remember_me: rem,
                                       email: email,
                                       password: pass}};
                return $http.post(this.logInPath, postData, {headers: headers})
                  .then(
                    function(resp) {
                      if ( 'name' in resp.data )
                        $rootScope.user = resp.data;
                      return resp.data;});
              };
              this.logOut = function(){
                return $http.delete(this.signOutPath, {headers: headers})
                .then(function(data){$window.location.reload();});
              };

              $rootScope.logOut = function(){that.logOut();};
            }]);
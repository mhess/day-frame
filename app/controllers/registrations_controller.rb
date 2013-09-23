class RegistrationsController < Devise::RegistrationsController
  
  def account_update_params
    permitted = resource_class.authentication_keys + [:password, :password_confirmation,
                                                      :current_password, :wake, :sleep, :name]
    params.require(:user).permit(*permitted)
  end
  
  def update_resource(resource, strong_params)
    if (strong_params[:password] + strong_params[:password_confirmation]).empty? then
      [:password, :password_confirmation].each {|k| strong_params.delete(k)}
    end
    resource.update(strong_params)
  end
end

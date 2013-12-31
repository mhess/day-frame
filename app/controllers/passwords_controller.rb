class PasswordsController < Devise::PasswordsController

  # POST /resource/password
  def create
    respond_to do |format|
      format.html { return super }
      format.json do
        res = resource_class.send_reset_password_instructions(resource_params)
        if successfully_sent?(res)
          render json: nil
        else
          render status: 422, json: {errors: res.errors.messages}
        end
      end
    end
  end
end

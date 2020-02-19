ENV['APP_ENV'] = 'test'

require_relative 'app'
require 'rack/test'

RSpec.configure do |c|
  c.include Rack::Test::Methods
  c.filter_run :focus => true
  c.run_all_when_everything_filtered = true
end
def app
  Sinatra::Application
end
ROOT = "/api/week"
RSpec.describe do
  let(:status){ last_response.status }
  context "/2020/2,4/th.json" do
    subject { JSON.parse(last_response.body).first(3).map{|j| j["date"]} }
    it do
      get ROOT + "/2020/2,4/th.json"
      is_expected.to eq ["2019-01-10", "2019-01-24", "2019-02-14"]
    end
  end
  context "/2020/2,4/th" do
    subject { last_response.body }
    it do
      get ROOT + "/2020/2,4/th"
      is_expected.to start_with "<!DOCTYPE html><html><head><title>2020年 第2、4 木曜日</title>"
    end
  end
end

# frozen_string_literal: true
require_relative 'week'

require 'sinatra'
require 'json'
require 'i18n'
include Week

I18n.load_path << File.expand_path("../locale.yml", __FILE__)
I18n.default_locale = :ja

Wdays = %w[su mo tu we th fr sa]
def title
  d = I18n.t :delimiter
  wname = @wdays.map{|w| (I18n.t :week_name)[w]}
  I18n.t :title, year: @year, num: @nums.join(d), wname: wname.join(d) 
end
def main(params)
  @year = params["year"].to_i
  @nums = params["num"].split(",").map(&:to_i)
  @wdays = params["wday"].split(",").map{|w| Wdays.index(w)}
  @json = week_array_for_year_around(@year, @wdays, @nums)
  case params["format"]
  when 'json'
    content_type :json
    headers "Access-Control-Allow-Origin"=>"*",
            "Cache-Control" => "s-maxage=100, stale-while-revalidate"
    body @json.to_json
  when 'csv'
    content_type :txt
    erb :"show.csv"
  when 'html',nil
    slim :show
  else
    status 404
  end 
rescue => e
  raise e
  status 404
  body "<script>console.log('error')</script>"
end
get '/api/week' do
  if params[:num2]
    nums = params['num'] + params['num2'].yield_self{|n| n=="" ? n : ",#{n}"  }
    redirect "/api/week/#{params['year']}/#{nums}/#{params['wday']}.#{params['format']}/"
    return
  end
  puts "params redirect"
  main(params)
end
get '/api/week/:year/:num/:wday(.:format)?', provides: %w[html csv json] do
  puts "full path"
  main(params)
end

# frozen_string_literal: true
require_relative 'week'

require 'active_support'
require 'active_support/time_with_zone'
require 'sinatra'
require 'json'
require 'i18n'
require 'icalendar'
include Week

I18n.load_path << File.expand_path("../locale.yml", __FILE__)
I18n.default_locale = :ja

Wdays = %w[su mo tu we th fr sa]
def title
  d = I18n.t :delimiter
  wname = @wdays.map{|w| (I18n.t :week_name)[w]}
  I18n.t :title, year: @year, num: @nums.join(d), wname: wname.join(d) 
end
def seconds_from_time_str(str)
  return 0 if str.nil?
  hour, min = str.split(":")
  hour.to_i * 60 * 60 + min.to_i * 60
end
def build_ical(opts)
  # Create a calendar with an event (standard method)
  cal = Icalendar::Calendar.new
  cal.ip_name = title
  @json.each do |j|
    wday = (I18n.t :week_name)[j[:wday]]
    d = j[:date].to_time
    cal.event do |e|
      e.dtstart     = d + seconds_from_time_str(opts["start_at"])
      if opts["end_at"]
        e.dtend = d + seconds_from_time_str(opts["end_at"])
      else
        e.duration    = "1D"
      end
      e.summary     = opts["summary"] || "第#{j[:num]} #{wday}曜日"
    end
  end
  cal.to_ical
end
def main(params)
  @year = params["year"].to_i
  @nums = params["num"].split(",").map(&:to_i)
  @wdays = params["wday"].split(",").map{|w| Wdays.index(w)}
  @json = week_array_for_year_around(@year, @wdays, @nums)
  
  headers "Cache-Control" => "s-maxage=60, stale-while-revalidate"
  case params["format"]
  when 'json'
    content_type :json
    headers "Access-Control-Allow-Origin"=>"*"
    body @json.to_json
  when 'js'
    content_type :js
    headers "Access-Control-Allow-Origin"=>"*"
    erb :"show.js"
  when 'csv'
    content_type :txt
    erb :"show.csv"
  when 'ical'
    build_ical(params.slice("summary", "start_at", "end_at"))
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
    path = "/api/week/#{params['year']}/#{nums}/#{params['wday']}.#{params['format']}"
    opts = params.slice("summary", "start_at", "end_at").select{|_, v| v && !v.empty? }
    path += "?#{opts.to_query}" unless opts.empty?
    redirect path
    return
  end
  main(params)
end
get '/api/week/:year/:num/:wday(.:format)?', provides: %w[html csv json] do
  main(params)
end

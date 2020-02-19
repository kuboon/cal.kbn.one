module Week
  # returns array of `Date` for 3 years from last to next
  def week_array_for_year_around(year, wdays, nums)
    ret = []
    wdays.each do |wday|
      nums.each do |num|
        ret.concat subset(year-1, wday, num)
        ret.concat subset(year  , wday, num)
        ret.concat subset(year+1, wday, num)
      end
    end
    ret.sort_by{|a| a[:date]}
  end
  def subset(year, wday, num)
    (1..12).map do |month|
      d = Date.new(year, month, 1)
      w_diff = (wday - d.wday) % 7
      d += w_diff + 7*(num-1)
      next unless d.month == month
      {
        date: d,
        wday: wday,
        num: num
      }
    end.compact
  end
end

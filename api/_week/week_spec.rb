require_relative 'week'
include Week

RSpec.describe do
  def dates(json, fmt = "%Y-%m-%d")
    json.map{|d| d[:date].strftime(fmt) }
  end
  describe "subset for 2020" do
    subject(:subj){ subset(2020, wday, num) }
    context "3rd tue" do
      let(:wday){ 2 }
      let(:num){ 3 }
      it { expect(subj.length).to eq 12 }
      it { expect(dates([subj.first])).to eq %w[2020-01-21] }
    end
    context "1st mon" do
      let(:wday){ 1 }
      let(:num){ 1 }
      it {expect(dates([subj.first])).to eq %w[2020-01-06] }
    end
  end
  describe "week_array_for_year_around 2021" do
    subject(:subj){ week_array_for_year_around(year, wdays, nums) }
    let(:year){ 2021 }
    context "1st mon, wed" do
      let(:wdays){ [1,3] }
      let(:nums){ [1] }
      subject{ dates(subj.first(3)) }
      it { is_expected.to eq %w[2020-01-01 2020-01-06 2020-02-03] }
    end
    context "2nd,4th thu" do
      let(:wdays){ [4] }
      let(:nums){ [2, 4] }
      subject{ dates(subj.first(3)) }
      it { is_expected.to eq %w[2020-01-09 2020-01-23 2020-02-13] }
    end
  end
end

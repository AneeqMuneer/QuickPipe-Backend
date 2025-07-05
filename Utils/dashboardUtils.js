exports.GetWeekStartAndEndDate = () => {
    const Today = new Date();
    const Day = Today.getDay();

    const Start = new Date(Today);
    const End = new Date(Today);

    const DaysSinceMonday = (Day === 0) ? 6 : Day - 1;
    Start.setDate(Today.getDate() - DaysSinceMonday);

    if (Day === 0) {
        End.setDate(Today.getDate());
    } else {
        End.setDate(Today.getDate() + (7 - Day));
    }

    const StartDate = Start.toISOString().split("T")[0];
    const EndDate = End.toISOString().split("T")[0];

    return { StartDate, EndDate };
}
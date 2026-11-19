# Words left out of a job's keywords: common English words, plus the words nearly every job ad
# uses ("experience", "team", "role"), which say nothing about this particular job. Only words
# of four letters or more are ever keywords, so shorter ones are not listed.
STOPWORDS = frozenset(
    """
    about above across after again against also although always among another anyone anything
    around based because been before being below between both bring built but came cannot could
    daily day days does doing done down during each either else enough even ever every everyone
    everything few find first from further gets give given goes going good great have having help
    here hers herself himself however into itself just keep kind know known last later least less
    like likely long look looking made make makes making many more most much must myself near need
    needed needs never next none nothing often once only onto other others otherwise ours ourselves
    over part per perhaps place please plus quite rather really same see seem several shall should
    show since some someone something soon still such sure take than that their theirs them
    themselves then there these they thing things think this those though through thus together
    toward towards under unless until upon used uses using very want wants well were what whatever
    when where whether which while whom whose will with within without work worked working works
    would year years your yours yourself yourselves you'll you're we're we've they're it's that's
    able ability abilities additional apply applying applicant applicants benefit benefits
    candidate candidates career company companies competitive culture deliver delivering desired
    environment equal etc excellent exciting experience experienced experiences familiar
    familiarity fast flexible full growing growth hands hiring ideal ideally include includes
    including join joining level looking minimum offer offering office opportunity opportunities
    passionate people plus position preferred preferably professional proficiency proficient
    qualification qualifications related remote requirement requirements required requires
    responsibilities responsibility responsible role roles salary senior junior skill skills
    solid strong success successful team teams understanding various ways world week weeks month
    months hybrid location based nice bonus degree equivalent relevant demonstrated proven track
    record closely colleagues day-to-day high highly key range wide end-to-end best across
    build builds building rebuild rebuilding write writes writing wrote ship ships shipping
    improve improves improving track tracks tracking hire hires hiring care cares clear
    comfortable hold holds consume consumes review reviews reviewing create creates creating
    develop develops developing maintain maintains maintaining support supports supporting
    ensure ensures ensuring drive drives driving lead leads leading manage manages managing
    takes taking turn turns keeps simple simply faster screen size mind need love enjoy eager
    detail details feature features plan plans step steps stay grow grows join joins help helps
    """.split()
)

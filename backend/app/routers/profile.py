from bson import ObjectId
from fastapi import APIRouter, Depends, Response

from app.core.auth import current_user_id
from app.routers.auth_cookies import auth_result, clear_refresh_cookie
from app.schemas.auth import AuthOut, ChangePasswordIn, DeleteAccountIn, ProfileUpdateIn, UserOut
from app.services import profile_service

# Every route acts on the logged-in user only; there is no user id in the path to tamper with.
router = APIRouter(prefix="/api/me", tags=["profile"])


@router.get("", response_model=UserOut)
async def get_profile(user_id: ObjectId = Depends(current_user_id)):
    return UserOut.from_doc(await profile_service.get_profile(user_id))


@router.patch("", response_model=UserOut)
async def update_profile(data: ProfileUpdateIn, user_id: ObjectId = Depends(current_user_id)):
    return UserOut.from_doc(await profile_service.update_name(user_id, data.name))


@router.post("/password", response_model=AuthOut)
async def change_password(data: ChangePasswordIn, response: Response, user_id: ObjectId = Depends(current_user_id)):
    user, session = await profile_service.change_password(user_id, data)
    return auth_result(response, user, session)


@router.delete("", status_code=204)
async def delete_account(data: DeleteAccountIn, user_id: ObjectId = Depends(current_user_id)):
    await profile_service.delete_account(user_id, data.password)
    response = Response(status_code=204)
    clear_refresh_cookie(response)
    return response

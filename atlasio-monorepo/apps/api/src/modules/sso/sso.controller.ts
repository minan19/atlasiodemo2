import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { SsoService } from './sso.service';

@ApiTags('sso')
@Controller('sso')
export class SsoController {
  constructor(private readonly sso: SsoService) {}

  // ─── Provider Management (Admin only) ──────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('providers')
  createProvider(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.sso.createProvider(tenantId, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('providers')
  listProviders(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.sso.listProviders(tenantId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('providers/:id')
  getProvider(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.sso.getProvider(id, tenantId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch('providers/:id')
  updateProvider(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.sso.updateProvider(id, tenantId, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.sso.deleteProvider(id, tenantId);
  }

  // ─── Public: Available SSO providers for tenant ────────────────────────────

  @Get('tenant/:tenantSlug/providers')
  async publicProviders(@Param('tenantSlug') tenantSlug: string) {
    // Resolve tenantSlug to tenantId — this endpoint is unauthenticated
    // so the login page can show SSO buttons
    return []; // Placeholder - would resolve slug to ID and list enabled providers
  }

  // ─── OIDC Flow ─────────────────────────────────────────────────────────────

  @Get('oidc/init/:providerId')
  async initiateOidc(
    @Param('providerId') providerId: string,
    @Query('tenantId') tenantId: string,
    @Res() res: any,
  ) {
    const result = await this.sso.initiateOidc(providerId, tenantId ?? 'public');
    return res.redirect(result.url);
  }

  @Get('oidc/callback')
  async oidcCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    const result = await this.sso.handleOidcCallback(code, state);
    // Redirect to frontend with tokens
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${frontendUrl}/login?sso=success&${params.toString()}`);
  }

  // ─── SAML2 Flow ────────────────────────────────────────────────────────────

  @Get('saml/init/:providerId')
  async initiateSaml(
    @Param('providerId') providerId: string,
    @Query('tenantId') tenantId: string,
    @Res() res: any,
  ) {
    const result = await this.sso.initiateSaml(providerId, tenantId ?? 'public');
    return res.redirect(result.url);
  }

  @Post('saml/acs')
  async samlAcs(
    @Body('SAMLResponse') samlResponse: string,
    @Body('RelayState') relayState: string,
    @Res() res: any,
  ) {
    const result = await this.sso.handleSamlCallback(samlResponse, relayState);
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${frontendUrl}/login?sso=success&${params.toString()}`);
  }

  // ─── User SSO Links ───────────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('me/links')
  getUserLinks(@Req() req: any) {
    return this.sso.getUserSsoLinks(req.user.id ?? req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Delete('me/links/:linkId')
  unlinkSso(@Param('linkId') linkId: string, @Req() req: any) {
    return this.sso.unlinkSso(req.user.id ?? req.user.userId, linkId);
  }
}
